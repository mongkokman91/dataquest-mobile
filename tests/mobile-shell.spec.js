const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const userscript = fs.readFileSync(path.join(__dirname, '..', 'dataquest-mobile.user.js'), 'utf8');

async function openLesson(page, pathname = '/mission/1/screen/1', variant = 'classic', interaction = 'click') {
  await page.goto(`http://127.0.0.1:4173${pathname}`);
  if (variant === 'missing') await page.evaluate(() => document.querySelector('#app').innerHTML = '<article data-testid="changed-layout"><h1>Lesson still loading</h1><p>Dataquest content must remain visible.</p></article>');
  else if (variant !== 'classic' || interaction !== 'click') await page.evaluate(opts => window.renderLesson(opts), { variant, interaction });
  await page.addScriptTag({ content: userscript });
  await expect(page.getByRole('button', { name: 'CODE', exact: true })).toBeVisible();
}

test('newest version replaces controls mounted by a stale userscript copy', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/mission/stale/screen/1');
  await page.evaluate(() => {
    document.body.insertAdjacentHTML('beforeend', '<section id="dq-native-editor-shell" data-dq-mobile-ui="shell"><textarea aria-label="stale editor"></textarea></section><nav id="dq-mobile-dock"><button>CODE</button></nav><output id="dq-mobile-toast"></output>');
    document.head.insertAdjacentHTML('beforeend', '<style id="dq-mobile-style">#dq-native-editor-shell{display:none}</style>');
  });
  await page.addScriptTag({ content: userscript });
  await expect(page.locator('#dq-native-editor-shell')).toHaveAttribute('data-dq-mobile-version', '0.8.1');
  await expect(page.getByLabel('stale editor')).toHaveCount(0);
  await expect(page.getByLabel('Dataquest mobile code editor')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'CODE', exact: true })).toHaveCount(1);
});

test('never blanks a loaded lesson when instructions and editor share a container', async ({ page }, testInfo) => {
  await openLesson(page, '/mission/shared/screen/1', 'shared');
  const shell = page.getByTestId('lesson-shell');
  const evidence = await shell.evaluate(element => {
    const style = getComputedStyle(element);
    return { html: element.outerHTML, display: style.display, visibility: style.visibility, opacity: style.opacity, box: element.getBoundingClientRect().toJSON() };
  });
  await testInfo.attach('lesson-layout.json', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
  await testInfo.attach('lesson-page.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
  expect(evidence.display).not.toBe('none');
  expect(evidence.visibility).not.toBe('hidden');
  expect(evidence.box.width).toBeGreaterThan(0);
  expect(evidence.box.height).toBeGreaterThan(0);
  await expect(page.getByText('Shared lesson content')).toBeVisible();
});

test('unknown or incomplete Dataquest layouts remain untouched and visible', async ({ page }) => {
  await openLesson(page, '/mission/loading', 'missing');
  const changed = page.getByTestId('changed-layout');
  await expect(changed).toBeVisible();
  await expect(changed).not.toHaveAttribute('data-dq-mobile-region');
  await page.getByRole('button', { name: 'DQ', exact: true }).click();
  await expect(changed).toBeVisible();
  await page.getByRole('button', { name: 'READ', exact: true }).click();
  await expect(changed).toBeVisible();
});

test('SPA lesson navigation loads a route-specific editor without stale code', async ({ page }) => {
  await openLesson(page, '/mission/1/screen/1');
  await page.getByRole('button', { name: 'CODE', exact: true }).click();
  await page.getByLabel('Dataquest mobile code editor').fill('old_route = True');
  await page.evaluate(() => {
    history.pushState({}, '', '/mission/1/screen/2');
    window.renderLesson({ value: 'new_route = True' });
  });
  await expect(page.getByLabel('Dataquest mobile code editor')).toHaveValue('new_route = True');
  await page.getByRole('button', { name: 'RUN', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.fixture.runs.at(-1))).toBe('new_route = True');
});

test('READ CODE DQ READ remains nonblank across repeated cycles', async ({ page }) => {
  await openLesson(page);
  for (let i = 0; i < 3; i++) {
    await expect(page.getByText('Solve the exercise.')).toBeVisible();
    await page.getByRole('button', { name: 'CODE', exact: true }).click();
    await expect(page.getByLabel('Dataquest mobile code editor')).toBeVisible();
    await page.getByRole('button', { name: 'DQ VIEW', exact: true }).click();
    await expect(page.getByText('Ready')).toBeVisible();
    await page.getByRole('button', { name: 'READ', exact: true }).last().click();
  }
  await expect(page.getByText('Solve the exercise.')).toBeVisible();
});

test('RUN and SUBMIT target enabled workspace controls after synchronization', async ({ page }, testInfo) => {
  await openLesson(page, '/mission/actions/screen/1', 'adversarial');
  await page.getByRole('button', { name: 'CODE', exact: true }).click();
  const editor = page.getByLabel('Dataquest mobile code editor');
  await editor.fill('current_answer = 42');
  await page.getByRole('button', { name: 'RUN', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.fixture.runs.at(-1))).toBe('current_answer = 42');
  expect(await page.evaluate(() => window.fixture.decoyClicks)).toBe(0);
  await expect(page.getByText('Ran: current_answer = 42')).toBeVisible();
  await testInfo.attach('run-state.json', {
    body: JSON.stringify(await page.evaluate(() => window.fixture), null, 2), contentType: 'application/json'
  });
  await page.getByRole('button', { name: 'CODE', exact: true }).click();
  await editor.fill('current_answer = 43');
  await page.getByRole('button', { name: 'SUBMIT', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.fixture.submits.at(-1))).toBe('current_answer = 43');
  expect(await page.evaluate(() => window.fixture.decoyClicks)).toBe(0);
  expect(await page.evaluate(() => window.fixture.controlClicks)).toEqual([
    { kind: 'run', disabled: false, value: 'current_answer = 42' },
    { kind: 'submit', disabled: false, value: 'current_answer = 43' }
  ]);
});

test('READ and DQ expose distinct instruction and execution regions', async ({ page }) => {
  await openLesson(page, '/mission/actions/screen/1', 'adversarial');
  const instructions = page.locator('[data-dq-instructions]');
  const results = page.locator('[data-dq-results]');
  await expect(instructions).toBeVisible();
  await expect(results).toBeHidden();
  await page.getByRole('button', { name: 'DQ', exact: true }).click();
  await expect(instructions).toBeHidden();
  await expect(results).toBeVisible();
  const boxes = await page.evaluate(() => ({
    read: document.querySelector('[data-dq-instructions]').getBoundingClientRect().toJSON(),
    dq: document.querySelector('[data-dq-results]').getBoundingClientRect().toJSON()
  }));
  expect(boxes.dq.width).toBeGreaterThan(0);
  expect(boxes.dq.height).toBeGreaterThan(0);
});

test('READ and CODE remain usable through repeated switching without duplicate UI', async ({ page }) => {
  await openLesson(page);
  await expect(page.getByText('Solve the exercise.')).toBeVisible();
  for (let i = 0; i < 4; i++) {
    await page.getByRole('button', { name: 'CODE', exact: true }).click();
    await expect(page.getByLabel('Dataquest mobile code editor')).toBeVisible();
    await page.getByRole('button', { name: 'READ', exact: true }).last().click();
    await expect(page.getByText('Solve the exercise.')).toBeVisible();
  }
  await expect(page.locator('#dq-mobile-dock')).toHaveCount(1);
  await expect(page.locator('#dq-native-editor-shell')).toHaveCount(1);
});

test('native input persists and RUN and SUBMIT receive the current code', async ({ page }) => {
  await openLesson(page);
  await page.getByRole('button', { name: 'CODE', exact: true }).click();
  const editor = page.getByLabel('Dataquest mobile code editor');
  await editor.fill('answer = 41');
  await editor.press('End');
  await editor.type('\nanswer += 1');
  await page.getByRole('button', { name: 'RUN', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.fixture.runs.at(-1))).toBe('answer = 41\nanswer += 1');
  await expect(page.getByText('Ran: answer = 41')).toBeVisible();
  await page.getByRole('button', { name: 'CODE', exact: true }).click();
  await editor.fill('answer = 43');
  await page.getByRole('button', { name: 'SUBMIT', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.fixture.submits.at(-1))).toBe('answer = 43');
});

test('draft is scoped by lesson URL and survives a page reload', async ({ page }) => {
  await openLesson(page, '/mission/1/screen/1');
  await page.getByRole('button', { name: 'CODE', exact: true }).click();
  await page.getByLabel('Dataquest mobile code editor').fill('screen_one = True');
  await page.reload();
  await page.addScriptTag({ content: userscript });
  await page.getByRole('button', { name: 'CODE', exact: true }).click();
  await expect(page.getByLabel('Dataquest mobile code editor')).toHaveValue('screen_one = True');
});

test('shell recovers after Dataquest rerenders to a structurally different workspace', async ({ page }) => {
  await openLesson(page);
  await page.getByRole('button', { name: 'CODE', exact: true }).click();
  await page.getByLabel('Dataquest mobile code editor').fill('after_rerender = 1');
  await page.evaluate(() => window.renderLesson({ value: 'new starter', variant: 'semantic' }));
  await page.getByRole('button', { name: 'RUN', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.fixture.runs.at(-1))).toBe('after_rerender = 1');
});

test('controls remain reachable when the visual viewport shrinks for the keyboard', async ({ page }) => {
  await openLesson(page);
  await page.getByRole('button', { name: 'CODE', exact: true }).click();
  await page.setViewportSize({ width: 360, height: 360 });
  const submit = page.getByRole('button', { name: 'SUBMIT', exact: true });
  await expect(submit).toBeInViewport();
  await expect(page.getByLabel('Dataquest mobile code editor')).toBeEditable();
});

test('storage contains only a pathname-scoped draft and no credential material', async ({ page }) => {
  await openLesson(page);
  await page.getByRole('button', { name: 'CODE', exact: true }).click();
  await page.getByLabel('Dataquest mobile code editor').fill('safe = true');
  const storage = await page.evaluate(() => ({ ...localStorage }));
  expect(Object.keys(storage)).toEqual(['/mission/1/screen/1'].map(p => `dq-mobile-draft:${p}`));
  expect(JSON.stringify(storage)).not.toMatch(/cookie|csrf|session|bearer|password|token/i);
});

// The following tests reproduce the real-device shape of #4: RUN/SUBMIT can
// dispatch a click that bubbles to the document while Dataquest's own
// application state never changes. A bare `target.click()` plus a
// document-level capture listener cannot tell that apart from genuine
// success, which is exactly why the previous suite reported green while RUN
// and SUBMIT were unresponsive on the real site.

test('RUN and SUBMIT never claim success when Dataquest silently ignores the tap', async ({ page }) => {
  test.slow();
  await openLesson(page, '/mission/actions/screen/1', 'classic', 'silent');
  await page.getByRole('button', { name: 'CODE', exact: true }).click();
  await page.getByLabel('Dataquest mobile code editor').fill('current_answer = 42');
  await page.getByRole('button', { name: 'RUN', exact: true }).click();
  const toast = page.locator('#dq-mobile-toast');
  await expect(toast).toBeVisible({ timeout: 14000 });
  await expect(toast).toHaveAttribute('data-error', 'true', { timeout: 14000 });
  await expect(toast).toContainText(/may not have reached dataquest/i);
  expect(await page.evaluate(() => window.fixture.runs)).toEqual([]);
  expect(await page.evaluate(() => window.fixture.cmChanges)).toBeGreaterThan(0);
});

test('RUN and SUBMIT reach touch-first Dataquest controls that never fire a plain click handler', async ({ page }) => {
  await openLesson(page, '/mission/actions/screen/1', 'classic', 'pointerup');
  await page.getByRole('button', { name: 'CODE', exact: true }).click();
  const editor = page.getByLabel('Dataquest mobile code editor');
  await editor.fill('current_answer = 42');
  await page.getByRole('button', { name: 'RUN', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.fixture.runs.at(-1)), { timeout: 8000 }).toBe('current_answer = 42');
  await expect(page.locator('#dq-mobile-toast')).toContainText(/run code activated/i, { timeout: 8000 });
  await page.getByRole('button', { name: 'CODE', exact: true }).click();
  await editor.fill('current_answer = 43');
  await page.getByRole('button', { name: 'SUBMIT', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.fixture.submits.at(-1)), { timeout: 8000 }).toBe('current_answer = 43');
});

test('the run/submit result stays visible in DQ view instead of being hidden inside the CODE shell', async ({ page }) => {
  await openLesson(page);
  await page.getByRole('button', { name: 'CODE', exact: true }).click();
  await page.getByLabel('Dataquest mobile code editor').fill('answer = 1');
  await page.getByRole('button', { name: 'RUN', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.fixture.runs.at(-1)), { timeout: 8000 }).toBe('answer = 1');
  await expect(page.locator('body')).toHaveAttribute('data-dq-mobile-mode', 'dq');
  const toast = page.locator('#dq-mobile-toast');
  await expect(toast).toBeVisible();
  await expect(toast).toHaveAttribute('data-error', 'false');
  await expect(toast).toContainText(/run code activated/i);
});

test('RUN and SUBMIT never activate visible, enabled controls that merely share a label inside the instructions region', async ({ page }) => {
  await openLesson(page, '/mission/actions/screen/1', 'adversarial');
  const decoyRun = page.locator('[data-decoy-action="run"]');
  const decoySubmit = page.locator('[data-decoy-action="submit"]');
  await expect(decoyRun).toBeVisible();
  await expect(decoySubmit).toBeVisible();
  await expect(decoyRun).toBeEnabled();
  await page.getByRole('button', { name: 'CODE', exact: true }).click();
  await page.getByLabel('Dataquest mobile code editor').fill('current_answer = 42');
  await page.getByRole('button', { name: 'RUN', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.fixture.runs.at(-1)), { timeout: 8000 }).toBe('current_answer = 42');
  expect(await page.evaluate(() => window.fixture.decoyClicks)).toBe(0);
});
