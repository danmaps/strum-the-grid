import { expect, test, type Page } from '@playwright/test';

async function ready(page: Page) {
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('map-status')).toHaveText('ArcGIS map ready', { timeout: 45_000 });
  await expect(page.locator('[data-span-id]')).toHaveCount(39);
}
async function firstSpanPoint(page: Page) {
  return page.locator('[data-span-id="DEMO-01"]').evaluate(path => {
    const p = (path as SVGPathElement).getPointAtLength((path as SVGPathElement).getTotalLength() / 2);
    const svg = path.closest('svg')!; const rect = svg.getBoundingClientRect();
    return { x: rect.x + p.x, y: rect.y + p.y };
  });
}

test('audio gesture, span selection, learning controls, profile, and resonance agree', async ({ page, baseURL }, info) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const origin = new URL(baseURL!).origin;
  const external: string[] = [];
  const failedAssets: string[] = [];
  page.on('request', req => {
    const url = new URL(req.url());
    if (url.origin !== origin && url.protocol !== 'data:' && url.protocol !== 'blob:') external.push(req.url());
  });
  page.on('response', response => {
    if (response.status() >= 400) failedAssets.push(`${response.status()} ${response.url()}`);
  });
  await ready(page);
  await expect(page.getByRole('complementary', { name: 'Selected span' })).toHaveCount(0);
  await page.getByRole('button', { name: /Enable sound/ }).click();
  await expect(page.getByRole('button', { name: /Sound on/ })).toBeVisible();
  await expect(page.getByLabel('Octave lift to audible range')).toBeChecked();
  const point = await firstSpanPoint(page);
  if (info.project.name === 'mobile') await page.touchscreen.tap(point.x, point.y);
  else await page.mouse.click(point.x, point.y);
  await expect(page.getByRole('complementary', { name: 'Selected span' }).getByRole('heading', { name: 'DEMO-01' })).toBeVisible();
  const initial = parseFloat(await page.getByTestId('fundamental-frequency').innerText());
  await page.getByRole('button', { name: /Change the physics/ }).click();
  await page.getByRole('button', { name: 'Span profile', exact: true }).click();
  const initialSag = parseFloat(await page.getByTestId('profile-sag').innerText());
  const tension = page.getByLabel('Reference tension (N)');
  await tension.fill('40000');
  await expect.poll(async () => parseFloat(await page.getByTestId('fundamental-frequency').innerText())).toBeGreaterThan(initial);
  await expect.poll(async () => parseFloat(await page.getByTestId('profile-sag').innerText())).toBeLessThan(initialSag);
  await page.getByRole('button', { name: /Open resonance laboratory/ }).click();
  await page.getByRole('button', { name: 'Mode 4', exact: true }).click();
  await expect(page.getByRole('img', { name: /mode 4, 5 nodes and 4 antinodes/ })).toBeVisible();
  await page.screenshot({ path: `test-results/${info.project.name}-laboratory.png`, fullPage: true });
  await page.locator('.stage-surface').screenshot({ path: `test-results/${info.project.name}-profile.png` });
  const frequency = page.getByLabel('Excitation frequency (Hz)');
  await frequency.press('Home');
  const low = parseFloat(await page.getByTestId('response-value').innerText());
  // Exercise native keyboard steps; avoid floating-point step mismatch from range.fill().
  for (let i = 0; i < 5; i++) await frequency.press('PageUp');
  await expect.poll(async () => parseFloat(await page.getByTestId('response-value').innerText())).toBeGreaterThan(low);
  await page.getByRole('button', { name: /Sound on/ }).click();
  await expect(page.getByRole('button', { name: /Sound muted/ })).toBeVisible();
  await page.getByLabel('Reduced motion').check();
  await page.getByRole('button', { name: /Reset all span parameters/ }).click();
  await expect.poll(async () => parseFloat(await page.getByTestId('fundamental-frequency').innerText())).toBe(initial);
  await page.getByRole('button', { name: 'Network map', exact: true }).click();
  await page.getByRole('button', { name: /Close span panel/ }).click();
  await page.screenshot({ path: `test-results/${info.project.name}-network.png`, fullPage: true });
  expect(errors).toEqual([]); expect(external).toEqual([]); expect(failedAssets).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('strum gestures excite once, keyboard plays, and path playback can be stopped', async ({ page }, info) => {
  await ready(page);
  const point = await firstSpanPoint(page);
  if (info.project.name === 'mobile') {
    const session = await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: point.x, y: point.y - 25 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: point.x, y: point.y + 25 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } else {
    await page.mouse.move(point.x, point.y - 25); await page.mouse.down();
    await page.mouse.move(point.x, point.y + 25, { steps: 10 }); await page.mouse.up();
  }
  await expect(page.getByTestId('strum-count')).toHaveText('1 EXCITATIONS');
  const map = page.getByRole('application', { name: /Synthetic network/ }); await map.focus(); await map.press('Space');
  await expect(page.getByTestId('strum-count')).toHaveText('2 EXCITATIONS');
  await map.press('ArrowRight'); await map.press('Enter');
  await expect(page.getByTestId('strum-count')).toHaveText('3 EXCITATIONS');
  await page.getByRole('button', { name: '▷ Play a path' }).click();
  await expect.poll(async () => parseInt(await page.getByTestId('strum-count').innerText())).toBeGreaterThan(4);
  await page.getByRole('button', { name: '■ Stop path' }).click();
  const count = await page.getByTestId('strum-count').innerText();
  await page.waitForTimeout(700); await expect(page.getByTestId('strum-count')).toHaveText(count);
  await page.getByRole('button', { name: /Close span panel/ }).click();
  await expect(page.getByRole('button', { name: '▷ Play a path' })).toHaveAttribute('aria-pressed', 'false');
});
