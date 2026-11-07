// Drives the sign-in page, the child's shelf, Challenge and Admin on the stand-in backend
// (tests/admin-groups-mock.js) at phone, tablet and computer sizes.
// Usage: PLAYWRIGHT_MODULE=/path/to/playwright PREVIEW_URL=http://127.0.0.1:8872/ SHOTS=/some/folder node tests/identity.cjs [chromium|webkit]
const pw = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const url = process.env.PREVIEW_URL || 'http://127.0.0.1:8872/';
const browserName = process.argv[2] || 'chromium';
const shots = process.env.SHOTS;
const sizes = [[360, 640], [390, 844], [820, 1180], [1180, 820], [1280, 800]];
const subjects = ['التربية الإسلامية', 'اللغة العربية', 'English', 'الرياضيات', 'العلوم', 'الاجتماعيات'];

const luminance = ([r, g, b]) => {
  const part = (v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * part(r) + 0.7152 * part(g) + 0.0722 * part(b);
};
const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const rgb = (text) => text.match(/[\d.]+/g).slice(0, 3).map(Number);

(async () => {
  const browser = await pw[browserName].launch();
  for (const [width, height] of sizes) {
    const label = `${browserName} ${width}x${height}`;
    const page = await (await browser.newContext({ viewport: { width, height }, locale: 'ar' })).newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push(m.text()); });
    const open = async (query) => {
      await page.goto(url + query);
      await page.addStyleTag({ content: '.preview-banner{display:none}' });
    };
    const sideways = async (where) => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${label} ${where}: sideways scroll`);
    const shot = async (name) => { if (shots) await page.screenshot({ path: `${shots}/${browserName}-${width}-${name}.png`, fullPage: true }); };
    const settled = () => page.waitForTimeout(800);

    // ── Sign-in page ──
    await open('?view=login');
    await page.locator('#loginForm').waitFor();
    await settled();
    const written = await page.locator('.login').innerText();
    for (const word of ['أعلام', 'خرائط', 'كلمات', 'تهجئة', 'قصص', 'نلعب']) assert.ok(!written.includes(word), `${label}: "${word}" is still written`);
    assert.deepEqual(await page.locator('.book .name').allInnerTexts(), subjects, `${label}: the six subjects`);
    assert.equal(await page.locator('h1').innerText(), 'هيا نتعلم');
    assert.ok((await page.locator('.go').boundingBox()).y + (await page.locator('.go').boundingBox()).height <= height, `${label}: the button is on the first screen`);
    await sideways('sign-in');
    await shot('1-login');

    const password = page.locator('input[name="password"]');
    await password.fill('secret-words');
    const padded = await password.evaluate((el) => parseFloat(getComputedStyle(el).paddingRight));
    assert.ok(padded >= 50, `${label}: the password stays clear of the eye button`);
    await page.locator('#togglePassword').click();
    assert.equal(await password.getAttribute('type'), 'text');
    assert.equal(await page.locator('#togglePassword').getAttribute('aria-pressed'), 'true');
    assert.equal(await password.evaluate((el) => getComputedStyle(el).direction), 'ltr');
    await page.locator('#togglePassword').click();
    assert.equal(await password.getAttribute('type'), 'password');
    assert.equal(await password.inputValue(), 'secret-words', `${label}: the eye button keeps what was typed`);

    await page.locator('input[name="username"]').fill('nobody_here');
    await page.locator('.go').click();
    await page.locator('#loginMessage.is-error', { hasText: 'اسم المستخدم غير موجود' }).waitFor();
    const message = await page.locator('#loginMessage').boundingBox();
    assert.ok(message.y + message.height <= height, `${label}: the error is on the first screen`);
    await shot('1-login-error');

    await page.locator('input[name="username"]').fill('NOURA_A');
    await page.locator('.go').click();
    await page.locator('#loginMessage.is-error').waitFor();
    await password.fill('preview-password');
    await page.locator('.go').click();
    await page.locator('#dashboardTitle', { hasText: 'نورة أحمد' }).waitFor();

    await page.locator('#logoutButton').click();
    await page.locator('#loginForm').waitFor();

    // ── The child's shelf ──
    await open('?view=child');
    await page.locator('.quiz-tile').first().waitFor();
    await settled();
    const expected = await page.evaluate(() => {
      const quizzes = quizCatalog.map((quiz) => [quiz.title, quiz.url]);
      return { quizzes, count: assignmentCatalog.length };
    });
    const tiles = page.locator('.quiz-tile');
    assert.equal(await tiles.count(), expected.count, `${label}: one book for each activity`);
    const links = await tiles.evaluateAll((all) => all.map((t) => [t.querySelector('.quiz-name').textContent, t.getAttribute('href')]));
    for (const pair of expected.quizzes) assert.ok(links.some(([name, href]) => name === pair[0] && href === pair[1]), `${label}: ${pair[0]} opens its own address`);
    const books = await tiles.evaluateAll((all) => all.map((t) => {
      const box = t.getBoundingClientRect();
      const s = getComputedStyle(t);
      return {
        name: t.querySelector('.quiz-name').textContent,
        ink: s.color,
        back: s.backgroundColor,
        spills: [...t.children].some((c) => { const r = c.getBoundingClientRect(); return r.top < box.top - 1 || r.bottom > box.bottom + 1 || r.left < box.left - 1 || r.right > box.right + 1; })
      };
    }));
    for (const book of books) {
      assert.ok(!book.spills, `${label}: ${book.name} fits on its book`);
      const ratio = contrast(rgb(book.ink), rgb(book.back));
      assert.ok(ratio >= 4.5, `${label}: ${book.name} contrast ${ratio.toFixed(2)}`);
    }
    await sideways('shelf');
    await shot('2-shelf');

    // ── Challenge ──
    await page.locator('#challengeTabButton').click();
    await page.locator('.challenge-row').first().waitFor();
    assert.ok(await page.locator('#quizzesPanel').isHidden());
    await sideways('challenge');
    await page.locator('#createChallengeForm button').click();
    await page.locator('#activeChallengeCard .challenge-player').first().waitFor();
    await sideways('challenge session');
    await shot('3-challenge');
    await page.evaluate(() => {
      // eslint-disable-next-line no-undef
      currentChallengeState = { ...currentChallengeState, status: 'active', current_answering_user_id: currentProfile.id, players: [...currentChallengeState.players, { user_id: 'u-2', display_name: 'فهد سالم', avatar: '⭐', is_host: false, wrong_count: 1 }] };
      // eslint-disable-next-line no-undef
      renderChallengeState();
    });
    await page.locator('.challenge-player.is-current-turn').waitFor();
    await sideways('challenge turn');
    await shot('3-challenge-turn');

    // ── Admin ──
    await open('');
    await page.locator('#adminGroupsPanel').waitFor();
    await page.locator('.group-card').first().waitFor();
    await page.locator('.group-card summary').first().click();
    await sideways('admin groups');
    await shot('4-admin-groups');
    await page.locator('[data-admin-tab="users"]').click();
    await page.locator('.admin-user').first().waitFor();
    await page.locator('.admin-user summary').first().click();
    await sideways('admin users');
    await shot('4-admin-users');
    await page.locator('[data-admin-tab="activity"]').click();
    await page.locator('#adminActivityList .user-activity').first().waitFor();
    await page.waitForTimeout(300);
    const activeTab = await page.locator('.tab-action.active-tab').evaluate((el) => [el.dataset.adminTab, getComputedStyle(el).backgroundColor, getComputedStyle(el).color]);
    assert.equal(activeTab[0], 'activity', `${label}: the tab of the open panel is the marked one`);
    assert.ok(contrast(rgb(activeTab[2]), rgb(activeTab[1])) >= 4.5, `${label}: the marked tab reads clearly`);
    await sideways('admin activity');
    await shot('4-admin-activity');

    assert.deepEqual(errors, [], `${label}: page errors`);
    await page.close();
    console.log(label, 'ok');
  }
  await browser.close();
})().catch((error) => { console.error(error); process.exit(1); });
