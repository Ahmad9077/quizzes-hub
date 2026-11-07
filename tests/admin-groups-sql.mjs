// Runs supabase/schema.sql and migration 026 on a real Postgres (PGlite, in-process) and checks
// how groups fill quiz_assignments, what stays, and who may do what. Touches no production data.
// Usage: PGLITE_DIR=/path/to/node_modules/@electric-sql/pglite node tests/admin-groups-sql.mjs
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

const dir = process.env.PGLITE_DIR
if (!dir) throw new Error('Set PGLITE_DIR to the @electric-sql/pglite package folder.')
const load = (file) => import(pathToFileURL(path.join(dir, 'dist', file)).href)
const { PGlite } = await load('index.js')
const { pgcrypto } = await load('contrib/pgcrypto.js')

const db = new PGlite({ extensions: { pgcrypto } })
const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')

// What Supabase provides around the project's own SQL.
await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;
`)
await db.exec(read(process.env.BASE_SCHEMA ?? 'supabase/schema.sql'))

const ids = { admin: 'a0000000-0000-4000-8000-000000000000', a: 'a0000000-0000-4000-8000-00000000000a', b: 'a0000000-0000-4000-8000-00000000000b', c: 'a0000000-0000-4000-8000-00000000000c', d: 'a0000000-0000-4000-8000-00000000000d' }
for (const [name, id] of Object.entries(ids)) {
  await db.query('insert into auth.users (id) values ($1)', [id])
  await db.query(`insert into public.profiles (id, username, login_email, display_name, role) values ($1, $2, $3, $4, $5)`, [id, `user_${name}`, `${name}@x.local`, name, name === 'admin' ? 'admin' : 'user'])
}
await db.exec(`insert into public.quizzes (id, title, url, icon, color) values
  ('q1','Q1','u','i','c'),('q2','Q2','u','i','c'),('q3','Q3','u','i','c'),('q4','Q4','u','i','c'),('q5','Q5','u','i','c')`)

// Today's data, before the migration: A has q1 (hard) and D has q4.
await db.query(`insert into public.quiz_assignments (user_id, quiz_id, difficulty) values ($1,'q1','hard'),($2,'q4','medium')`, [ids.a, ids.d])
await db.query(`insert into public.quiz_progress (user_id, quiz_id, score, total) values ($1,'q1',3,5)`, [ids.a])

await db.exec(read('supabase/migrations/026_admin_groups.sql'))

const asUser = async (id, fn) => {
  await db.exec(`set role authenticated; select set_config('test.uid', '${id}', false);`)
  try { return await fn() } finally { await db.exec(`reset role; select set_config('test.uid', '', false);`) }
}
const asAdmin = (fn) => asUser(ids.admin, fn)
const call = (sql, params = []) => db.query(`select ${sql}`, params)
const fails = async (fn, pattern) => assert.rejects(fn, (e) => { assert.match(e.message, pattern); return true })

const has = async (user) => (await db.query(`select quiz_id, direct, difficulty from public.quiz_assignments where user_id = $1 order by quiz_id`, [user])).rows
const list = async (user) => (await has(user)).map((r) => r.quiz_id + (r.direct ? '' : '*'))
let passed = 0
const check = async (name, fn) => { await fn(); passed += 1; console.log('  ok', name) }

await check('the migration changes nothing anyone has today', async () => {
  assert.deepEqual(await list(ids.a), ['q1'])
  assert.deepEqual(await list(ids.d), ['q4'])
  assert.equal((await has(ids.a))[0].difficulty, 'hard')
  assert.equal((await db.query(`select count(*)::int n from public.quiz_groups`)).rows[0].n, 0)
})

const create = (name) => asAdmin(async () => (await call(`public.admin_create_group($1) id`, [name])).rows[0].id)
const quizzes = (g, list, on) => asAdmin(() => call(`public.admin_set_group_quizzes($1, $2, $3)`, [g, list, on]))
const members = (g, list, on) => asAdmin(() => call(`public.admin_set_group_members($1, $2, $3)`, [g, list, on]))
const personal = (u, list) => asAdmin(() => call(`public.admin_set_assignments($1, $2)`, [u, JSON.stringify(list.map((quiz_id) => ({ quiz_id, difficulty: 'medium' })))]))

const g1 = await create('الأول الابتدائي')
const g2 = await create('بنات')

await check('adding activities and members gives every member every activity', async () => {
  await quizzes(g1, ['q1', 'q2'], true)
  await members(g1, [ids.a, ids.b], true)
  assert.deepEqual(await list(ids.b), ['q1*', 'q2*'])
})

await check('what an account already had stays its own, with its difficulty', async () => {
  assert.deepEqual(await list(ids.a), ['q1', 'q2*'])
  assert.equal((await has(ids.a))[0].difficulty, 'hard')
})

await check('a new member gets everything at once, and a new activity reaches everyone', async () => {
  await members(g1, [ids.c], true)
  assert.deepEqual(await list(ids.c), ['q1*', 'q2*'])
  await quizzes(g1, ['q3'], true)
  for (const u of [ids.b, ids.c]) assert.deepEqual(await list(u), ['q1*', 'q2*', 'q3*'])
})

await check('removing an activity removes it only where the group gave it', async () => {
  await quizzes(g1, ['q1'], false)
  assert.deepEqual(await list(ids.a), ['q1', 'q2*', 'q3*'])
  assert.deepEqual(await list(ids.b), ['q2*', 'q3*'])
})

await check('an activity from two groups stays until both let go', async () => {
  await quizzes(g2, ['q3'], true)
  await members(g2, [ids.b], true)
  await quizzes(g1, ['q3'], false)
  assert.deepEqual(await list(ids.b), ['q2*', 'q3*'])
  assert.deepEqual(await list(ids.c), ['q2*'])
  await members(g2, [ids.b], false)
  assert.deepEqual(await list(ids.b), ['q2*'])
})

await check('saving an account changes only its own activities', async () => {
  await personal(ids.b, ['q5'])
  assert.deepEqual(await list(ids.b), ['q2*', 'q5'])
  await personal(ids.b, [])
  assert.deepEqual(await list(ids.b), ['q2*'])
})

await check('an activity given both ways survives losing either way', async () => {
  await personal(ids.b, ['q2'])
  assert.deepEqual(await list(ids.b), ['q2'])
  await members(g1, [ids.b], false)
  assert.deepEqual(await list(ids.b), ['q2'])
  await members(g1, [ids.b], true)
  await personal(ids.b, [])
  assert.deepEqual(await list(ids.b), ['q2*'])
})

await check('saving keeps a difficulty and the old call shape still works', async () => {
  await personal(ids.a, ['q1'])
  assert.equal((await has(ids.a)).find((r) => r.quiz_id === 'q1').difficulty, 'hard')
  await fails(() => asAdmin(() => call(`public.admin_set_assignments($1, $2)`, [ids.a, JSON.stringify([{ quiz_id: 'nope' }])])), /Unknown quiz/)
})

await check('leaving a group keeps results, and the account can no longer save to that activity', async () => {
  await asUser(ids.c, () => db.query(`insert into public.quiz_progress (user_id, quiz_id, score, total) values ($1,'q2',1,2)`, [ids.c]))
  await members(g1, [ids.c], false)
  assert.deepEqual(await list(ids.c), [])
  assert.equal((await db.query(`select count(*)::int n from public.quiz_progress where user_id = $1`, [ids.c])).rows[0].n, 1)
  await fails(() => asUser(ids.c, () => db.query(`insert into public.quiz_progress (user_id, quiz_id, score, total) values ($1,'q2',1,2)`, [ids.c])), /row-level security/)
})

await check('names are checked', async () => {
  await fails(() => create('بنات'), /Group name is taken/)
  await fails(() => create(' '), /Group name is required/)
  await fails(() => asAdmin(() => call(`public.admin_rename_group($1, $2)`, [g1, 'بنات'])), /Group name is taken/)
  await asAdmin(() => call(`public.admin_rename_group($1, $2)`, [g2, 'بنات الأول']))
  await fails(() => quizzes(g1, ['nope'], true), /Unknown quiz/)
  await fails(() => members(g1, ['a0000000-0000-4000-8000-0000000000ff'], true), /User profile/)
})

await check('only the Admin can see or change groups', async () => {
  await asUser(ids.a, async () => {
    assert.equal((await db.query(`select count(*)::int n from public.quiz_groups`)).rows[0].n, 0)
    assert.equal((await db.query(`select count(*)::int n from public.quiz_group_members`)).rows[0].n, 0)
    assert.equal((await db.query(`select count(*)::int n from public.quiz_group_quizzes`)).rows[0].n, 0)
    await fails(() => call(`public.admin_create_group('x y')`), /Admin access required/)
    await fails(() => call(`public.admin_set_group_quizzes($1, $2, true)`, [g1, ['q5']]), /Admin access required/)
    await fails(() => call(`public.admin_set_group_members($1, $2, true)`, [g1, [ids.a]]), /Admin access required/)
    await fails(() => call(`public.admin_delete_group($1)`, [g1]), /Admin access required/)
    await fails(() => call(`public.admin_set_assignments($1, '[]')`, [ids.a]), /Admin access required/)
    await fails(() => db.query(`insert into public.quiz_group_members (group_id, user_id) values ($1, $2)`, [g1, ids.a]), /row-level security/)
    assert.equal((await db.query(`update public.quiz_assignments set direct = true where user_id = $1`, [ids.a])).affectedRows, 0)
    await fails(() => db.query(`select public.sync_group_assignments()`), /permission denied|trigger functions/)
  })
  await db.exec(`set role anon; select set_config('test.uid', '', false);`)
  await fails(() => call(`public.admin_create_group('x y')`), /permission denied/)
  await db.exec(`reset role;`)
})

await check('deleting a group leaves each member only what is theirs', async () => {
  const g3 = await create('مؤقتة')
  await quizzes(g3, ['q5'], true)
  await members(g3, [ids.a, ids.d], true)
  assert.deepEqual(await list(ids.d), ['q4', 'q5*'])
  await asAdmin(() => call(`public.admin_delete_group($1)`, [g3]))
  assert.deepEqual(await list(ids.d), ['q4'])
  assert.ok(!(await list(ids.a)).includes('q5*'))
  assert.equal((await db.query(`select count(*)::int n from public.profiles where id = $1`, [ids.d])).rows[0].n, 1)
})

await check('deleting an account or an activity cleans up without touching others', async () => {
  await members(g1, [ids.d], true)
  await asAdmin(() => call(`public.admin_delete_user($1)`, [ids.b]))
  assert.equal((await db.query(`select count(*)::int n from public.quiz_group_members where user_id = $1`, [ids.b])).rows[0].n, 0)
  assert.deepEqual(await list(ids.d), ['q2*', 'q4'])
  await db.query(`delete from public.quizzes where id = 'q2'`)
  assert.deepEqual(await list(ids.d), ['q4'])
  assert.equal((await db.query(`select count(*)::int n from public.quiz_group_quizzes where quiz_id = 'q2'`)).rows[0].n, 0)
})

await db.close()
console.log(`${passed} checks passed on Postgres.`)
