const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const userscript = fs.readFileSync(path.join(__dirname, '..', 'dataquest-mobile.user.js'), 'utf8');

async function openLesson(page, pathname = '/mission/1/screen/1') {
  await page.goto(`http://127.0.0.1:4173${pathname}`);
  await page.addScriptTag({ content: userscript });
  await expect(page.getByRole('button', { name: 'CODE', exact: true })).toBeVisible();
}

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
