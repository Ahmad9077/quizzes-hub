import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

type CreateUserBody = {
  username: string;
  displayName: string;
  password: string;
  role?: "user" | "admin";
  quizIds?: string[];
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: "Function environment is not configured." }, 500);
  }

  const authHeader = request.headers.get("Authorization") || "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } }
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: requesterData, error: requesterError } = await userClient.auth.getUser();
  if (requesterError || !requesterData.user) {
    return json({ error: "Not signed in." }, 401);
  }

  const { data: requesterProfile, error: profileError } = await adminClient
    .from("profiles")
    .select("role, active")
    .eq("id", requesterData.user.id)
    .single();

  if (profileError || requesterProfile?.role !== "admin" || !requesterProfile.active) {
    return json({ error: "Admin access required." }, 403);
  }

  const body = await request.json() as CreateUserBody;
  const username = String(body.username || "").trim().toLowerCase();
  const displayName = String(body.displayName || "").trim();
  const password = String(body.password || "");
  const role = body.role === "admin" ? "admin" : "user";
  const quizIds = Array.isArray(body.quizIds) ? body.quizIds : [];

  if (!/^[a-z0-9_]{3,32}$/.test(username)) {
    return json({ error: "Username must be 3-32 lowercase letters, numbers, or underscores." }, 400);
  }

  if (displayName.length < 2) {
    return json({ error: "Display name is required." }, 400);
  }

  if (password.length < 8) {
    return json({ error: "Password must be at least 8 characters." }, 400);
  }

  const loginEmail = `${username}@users.quizzeshub.local`;
  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email: loginEmail,
    password,
    email_confirm: true,
    user_metadata: { username, display_name: displayName }
  });

  if (createError || !created.user) {
    return json({ error: createError?.message || "Could not create auth user." }, 400);
  }

  const { error: profileInsertError } = await adminClient.from("profiles").insert({
    id: created.user.id,
    username,
    login_email: loginEmail,
    display_name: displayName,
    role,
    avatar: role === "admin" ? "⭐" : "🚀",
    active: true
  });

  if (profileInsertError) {
    await adminClient.auth.admin.deleteUser(created.user.id);
    return json({ error: profileInsertError.message }, 400);
  }

  if (quizIds.length) {
    const { error: assignmentError } = await adminClient
      .from("quiz_assignments")
      .insert(quizIds.map((quizId) => ({ user_id: created.user.id, quiz_id: quizId })));

    if (assignmentError) {
      return json({ error: assignmentError.message }, 400);
    }
  }

  return json({ id: created.user.id, username, displayName, role });
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
