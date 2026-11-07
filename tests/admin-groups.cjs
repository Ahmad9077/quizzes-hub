// Drives the Admin page on the stand-in backend (tests/admin-groups-mock.js) in a real browser.
// Usage: PLAYWRIGHT_MODULE=/path/to/playwright PREVIEW_URL=http://127.0.0.1:8872/ node tests/admin-groups.cjs [chromium|webkit]
const pw = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const url = process.env.PREVIEW_URL || 'http://127.0.0.1:8872/';
const browserName = process.argv[2] || 'chromium';
const shots = process.env.SHOTS;

(async () => {
  const browser = await pw[browserName].launch();
  for (const viewport of [{ width: 1180, height: 820 }, { width: 390, height: 844 }]) {
    const page = await (await browser.newContext({ viewport, locale: 'ar' })).newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(url);
    await page.locator('#adminGroupsPanel').waitFor();

    const db = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__previewDb)));
    const quizzesOf = async (userId) => (await db()).quiz_assignments.filter((a) => a.user_id === userId).map((a) => a.quiz_id + (a.direct ? '' : '*')).sort();
    const idOf = async (username) => (await db()).profiles.find((u) => u.username === username).id;
    const noOverflow = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'page scrolls sideways');
    const shot = async (name) => { if (shots) await page.screenshot({ path: `${shots}/${browserName}-${viewport.width}-${name}.png`, fullPage: true }); };
    const confirmYes = () => page.locator('.confirm-dialog .danger-action').click();
    const confirmNo = () => page.locator('.confirm-dialog button', { hasText: 'إلغاء' }).click();
    const save = (text) => page.locator('#adminGroupsPanel .form-message', { hasText: text }).first().waitFor();

    await page.locator('.group-card').first().waitFor();
    assert.match(await page.locator('.group-card summary').first().innerText(), /الأول الابتدائي[\s\S]*3 أعضاء · نشاطان/);
    await shot('1-groups');

    // A new group opens by itself; a duplicate name is refused.
    await page.fill('[name="groupName"]', 'الأول الابتدائي');
    await page.click('#createGroupForm button');
    await page.locator('#createGroupMessage', { hasText: 'توجد مجموعة بهذا الاسم' }).waitFor();
    await page.fill('[name="groupName"]', 'بنات الأول');
    await page.click('#createGroupForm button');
    const card = page.locator('.group-card', { hasText: 'بنات الأول' });
    await card.locator('.member-adder').waitFor();
    assert.equal(await card.evaluate((node) => node.open), true);
    await noOverflow();

    // Activities first, members after: every member gets them at once.
    const tick = (text) => card.locator('fieldset .checkbox-row', { hasText: text }).locator('input');
    await tick('علوم - بنات').check();
    await save('متاحًا لكل أعضاء المجموعة');
    await tick('English').check();
    await save('«English» متاحًا');
    await card.locator('.member-adder > summary').click();
    await card.locator('.member-candidates .checkbox-row', { hasText: 'مريم حسن' }).locator('input').click();
    await card.locator('.member-chip', { hasText: 'مريم حسن' }).waitFor();
    assert.deepEqual(await quizzesOf('u-5'), ['english-grade1*', 'science-grade1*']);
    assert.match(await card.locator('summary').first().innerText(), /عضو واحد · نشاطان/);

    // An account made by hand can join the group right away, and gets its activities.
    await page.click('[data-admin-tab="users"]');
    await page.locator('#newUserGroups .checkbox-row').first().waitFor();
    await page.fill('#createUserForm [name="username"]', 'salma_t');
    await page.fill('#createUserForm [name="displayName"]', 'سلمى طارق');
    await page.fill('#createUserForm [name="password"]', 'test-only-1');
    await page.locator('#newUserGroups .checkbox-row', { hasText: 'بنات الأول' }).locator('input').check();
    await page.click('#createUserForm button[type="submit"]');
    await page.locator('#createUserMessage', { hasText: 'تم إنشاء المستخدم' }).waitFor();
    assert.deepEqual(await quizzesOf(await idOf('salma_t')), ['english-grade1*', 'science-grade1*']);
    await page.locator('.admin-user', { hasText: 'سلمى طارق' }).locator('.group-chip', { hasText: 'بنات الأول' }).waitFor();
    await noOverflow();
    await shot('2-new-user');
    await page.click('[data-admin-tab="groups"]');
    await card.locator('.member-chip', { hasText: 'سلمى طارق' }).waitFor();

    // The account page: from the group is ticked and locked; its own can be added and saved.
    await page.click('[data-admin-tab="users"]');
    await page.locator('#adminUsersPanel .admin-user').first().waitFor();
    assert.match(await page.locator('#adminUsersCount').innerText(), /^10 من 10$/);
    await page.fill('[data-admin-filter="users"] input', 'مريم');
    const row = page.locator('.admin-user', { hasText: 'مريم حسن' });
    assert.equal(await page.locator('.admin-user').count(), 1);
    assert.match(await row.locator('summary').innerText(), /بنات الأول/);
    await row.locator('summary').click();
    const locked = row.locator('.checkbox-row', { hasText: 'English' }).locator('input');
    assert.equal(await locked.isChecked(), true);
    assert.equal(await locked.isDisabled(), true);
    assert.match(await row.locator('.checkbox-row', { hasText: 'English' }).innerText(), /من مجموعة بنات الأول/);
    await row.locator('.checkbox-row', { hasText: 'الرياضيات - الأول الابتدائي' }).locator('input').check();
    await noOverflow();
    await shot('3-user');
    await row.locator('.save-access').click();
    await page.waitForFunction(() => window.__previewDb.quiz_assignments.some((a) => a.user_id === 'u-5' && a.quiz_id === 'math-grade1'));
    assert.deepEqual(await quizzesOf('u-5'), ['english-grade1*', 'math-grade1', 'science-grade1*']);
    await page.locator('.admin-user', { hasText: 'مريم حسن' }).locator('.save-access').waitFor();

    // Filters: by group, and people in no group.
    await page.fill('[data-admin-filter="users"] input', '');
    await page.selectOption('[data-admin-filter="users"] select', { label: 'الأول الابتدائي' });
    assert.equal(await page.locator('.admin-user').count(), 3);
    await page.selectOption('[data-admin-filter="users"] select', 'none');
    assert.ok((await page.locator('.admin-user').allInnerTexts()).every((text) => !text.includes('بنات الأول')));
    await page.selectOption('[data-admin-filter="users"] select', 'all');

    // Back in the group: removing an activity asks, and leaves what the account has itself.
    await page.click('[data-admin-tab="groups"]');
    await tick('English').waitFor();
    await tick('English').uncheck();
    await confirmNo();
    assert.equal(await tick('English').isChecked(), true);
    assert.deepEqual(await quizzesOf('u-5'), ['english-grade1*', 'math-grade1', 'science-grade1*']);
    await tick('English').uncheck();
    await confirmYes();
    await save('أُزيل «English»');
    assert.deepEqual(await quizzesOf('u-5'), ['math-grade1', 'science-grade1*']);

    // Removing a member, then the whole group, keeps each account and what is its own.
    await card.locator('.member-chip', { hasText: 'مريم حسن' }).locator('button').click();
    await confirmYes();
    await card.locator('.member-chip', { hasText: 'مريم حسن' }).waitFor({ state: 'detached' });
    assert.deepEqual(await quizzesOf('u-5'), ['math-grade1']);
    const stillThere = await idOf('salma_t');
    await card.locator('.group-settings .danger-action').click();
    await confirmYes();
    await card.waitFor({ state: 'detached' });
    assert.deepEqual(await quizzesOf(stillThere), []);
    assert.ok((await db()).profiles.some((u) => u.id === stillThere));
    assert.deepEqual(await quizzesOf('u-1'), ['arabic-grade1*', 'math-grade1*', 'world-flags']);

    // Rename.
    const main = page.locator('.group-card', { hasText: 'الأول الابتدائي' });
    await main.locator('summary').click();
    await main.locator('.group-settings input').fill('الأول الابتدائي - فصل ١');
    await main.locator('.group-settings button[type="submit"]').click();
    await page.locator('.group-card', { hasText: 'فصل ١' }).waitFor();

    // Activity tab filter.
    await page.click('[data-admin-tab="activity"]');
    await page.locator('#adminActivityList .user-activity').first().waitFor();
    await page.fill('[data-admin-filter="activity"] input', 'فهد');
    assert.equal(await page.locator('#adminActivityList .user-activity:visible').count(), 1);
    await noOverflow();
    await shot('4-activity');

    assert.deepEqual(errors, []);
    console.log(`  ${browserName} ${viewport.width}px passed`);
    await page.close();
  }
  await browser.close();
})().catch((error) => { console.error(error); process.exit(1); });
