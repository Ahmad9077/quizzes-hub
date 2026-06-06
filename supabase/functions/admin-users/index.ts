import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://ahmad9077.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

type AdminUsersBody = {
  action?: "create" | "update-password";
  username?: string;
  displayName?: string;
  password?: string;
  role?: "user" | "admin";
  quizIds?: string[];
  userId?: string;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || getDefaultKey("SUPABASE_PUBLISHABLE_KEYS");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || getDefaultKey("SUPABASE_SECRET_KEYS");

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

  const body = await request.json() as AdminUsersBody;

  if (body.action === "update-password") {
    const targetUserId = String(body.userId || "").trim();

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(targetUserId)) {
      return json({ error: "Valid user ID is required." }, 400);
    }

    const { data: targetProfile, error: targetError } = await adminClient
      .from("profiles")
      .select("id")
      .eq("id", targetUserId)
      .single();

    if (targetError || !targetProfile) {
      return json({ error: "User profile was not found." }, 404);
    }

    const newPassword = String(body.password || "");

    if (newPassword.length < 8) {
      return json({ error: "Password must be at least 8 characters." }, 400);
    }

    const { error: updateError } = await adminClient.auth.admin.updateUserById(targetUserId, {
      password: newPassword
    });

    if (updateError) {
      return json({ error: updateError.message }, 400);
    }

    return json({ id: targetUserId, updated: true });
  }

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
      await adminClient.auth.admin.deleteUser(created.user.id);
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

function getDefaultKey(name: string) {
  const value = Deno.env.get(name);
  if (!value) return undefined;

  try {
    const keys = JSON.parse(value) as Record<string, string>;
    return keys.default || Object.values(keys)[0];
  } catch {
    return value;
  }
}
