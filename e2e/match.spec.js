import { test, expect } from '@playwright/test';

test.describe('matchstick puzzle solver', () => {
  test.beforeEach(async ({ page }) => {
    // Each test gets a fresh BrowserContext (so localStorage is empty)
    // and lands on the home page with the default ruleset selected.
    await page.goto('/index.html');
    // setup() runs in a deferred module script — wait until it has
    // populated the samples list before any test interacts with the UI.
    await page.locator('#samples li[data-equation]').first().waitFor();
  });

  test('page loads with the three ruleset radios in order strict / default / flexible', async ({ page }) => {
    const radios = page.locator('input[name="ruleset"]');
    await expect(radios).toHaveCount(3);
    await expect(radios.nth(0)).toHaveValue('strict');
    await expect(radios.nth(1)).toHaveValue('default');
    await expect(radios.nth(2)).toHaveValue('flexible');
    // 'default' is the initially selected one even though it sits at index 1
    await expect(page.locator('input[value="default"]')).toBeChecked();
  });

  test('ruleset description updates when switched', async ({ page }) => {
    const desc = page.locator('#ruleset-description');
    await expect(desc).toContainText('A bit more flexible');

    await page.locator('input[value="strict"]').check();
    await expect(desc).toContainText('Classic simple matchstick rules');

    await page.locator('input[value="flexible"]').check();
    await expect(desc).toContainText('9 and 6 can be written in two variants');
  });

  test('equations in the ruleset description are clickable and load into the input', async ({ page }) => {
    // Default description mentions 1+2=7 and -1+2=1 as example puzzle → solution.
    const link = page.locator('#ruleset-description .eq-link[data-equation="1+2=7"]');
    await expect(link).toBeVisible();
    await link.click();
    await expect(page.locator('#equation')).toHaveValue('1+2=7');
  });

  test('typing an invalid equation flags it ✗ and shows solutions', async ({ page }) => {
    const input = page.locator('#equation');
    await input.fill('6+4=4');

    await expect(page.locator('#validity')).toHaveText('✗');
    await expect(page.locator('#status p').first()).toContainText('Found 2 solutions');
    // Solutions list contains the two canonical fixes
    const sols = page.locator('#status li[data-equation]');
    await expect(sols).toHaveCount(2);
    await expect(sols.filter({ has: page.locator('[data-equation="0+4=4"]') })).toHaveCount(0);
    // Easier check: solution data attributes
    const datas = await sols.evaluateAll(els => els.map(e => e.dataset.equation));
    expect(datas).toEqual(expect.arrayContaining(['0+4=4', '8-4=4']));
  });

  test('typing a true equation flags it ✓ and offers quiz tasks', async ({ page }) => {
    await page.locator('#equation').fill('1+1=2');
    await expect(page.locator('#validity')).toHaveText('✓');
    await expect(page.locator('#status p').first()).toContainText('possible quiz tasks');
  });

  test('clicking a sample loads it into the input', async ({ page }) => {
    const sample = page.locator('#samples li[data-equation]').first();
    const eq = await sample.getAttribute('data-equation');
    await sample.click();
    await expect(page.locator('#equation')).toHaveValue(eq);
  });

  test('selected ruleset persists across reloads', async ({ page }) => {
    await page.locator('input[value="strict"]').check();
    await page.reload();
    await expect(page.locator('input[value="strict"]')).toBeChecked();
  });

  test.describe('default ruleset', () => {
    test.beforeEach(async ({ page }) => {
      await page.locator('input[value="default"]').check();
    });

    test('produces leading-minus solution for "1+2=7"', async ({ page }) => {
      await page.locator('#equation').fill('1+2=7');
      const sols = page.locator('#status li[data-equation]');
      const datas = await sols.evaluateAll(els => els.map(e => e.dataset.equation));
      expect(datas).toContain('-1+2=1');
    });

    test('"+2+2=4" is valid under default (lenient eval)', async ({ page }) => {
      await page.locator('#equation').fill('+2+2=4');
      await expect(page.locator('#validity')).toHaveText('✓');
    });
  });

  test.describe('strict ruleset', () => {
    test.beforeEach(async ({ page }) => {
      await page.locator('input[value="strict"]').check();
    });

    test('"+2+2=4" is invalid under strict (leading-operator rejected)', async ({ page }) => {
      await page.locator('#equation').fill('+2+2=4');
      await expect(page.locator('#validity')).toHaveText('✗');
    });

    test('"1+2=7" has NO solution under strict', async ({ page }) => {
      await page.locator('#equation').fill('1+2=7');
      // No solutions branch shows the sad emoji
      await expect(page.locator('#status p')).toHaveText('No solutions found 😢');
    });

    test('hides default-only and flexible-only samples', async ({ page }) => {
      const datas = await page.locator('#samples li[data-equation]').evaluateAll(
        els => els.map(e => e.dataset.equation)
      );
      // Default-only samples should not be present
      expect(datas).not.toContain('1+2=7');
      expect(datas).not.toContain('-1+1=0');
      // Flexible-only samples should not be present
      expect(datas).not.toContain('2-5=3');
    });
  });

  test.describe('flexible ruleset — alt-form digits', () => {
    test.beforeEach(async ({ page }) => {
      await page.locator('input[value="flexible"]').check();
    });

    test('"5+5=11" produces alt-6 solution containing b', async ({ page }) => {
      await page.locator('#equation').fill('5+5=11');
      const datas = await page.locator('#status li[data-equation]').evaluateAll(
        els => els.map(e => e.dataset.equation)
      );
      // At least one solution should contain the alt char b
      expect(datas.some(s => s.includes('b'))).toBe(true);
    });

    test('alt-6 SVG renders as a 5-segment shape (b symbol)', async ({ page }) => {
      await page.locator('#equation').fill('5+5=11');
      // Find a solution containing b, then assert its SVG uses #c-b
      const altLi = page.locator('#status li[data-equation*="b"]').first();
      await expect(altLi).toBeVisible();
      const altUseHrefs = await altLi.locator('use').evaluateAll(
        els => els.map(e => e.getAttribute('href'))
      );
      expect(altUseHrefs).toContain('#c-b');
    });
  });

  test.describe('flexible ruleset — alt-form operators', () => {
    test.beforeEach(async ({ page }) => {
      await page.locator('input[value="flexible"]').check();
    });

    test('"2-5=3" yields the swap solution 2E5M3', async ({ page }) => {
      await page.locator('#equation').fill('2-5=3');
      const datas = await page.locator('#status li[data-equation]').evaluateAll(
        els => els.map(e => e.dataset.equation)
      );
      expect(datas).toContain('2E5M3');
    });

    test('alt-= (E) and alt-- (M) render with their own SVG symbols', async ({ page }) => {
      await page.locator('#equation').fill('2-5=3');
      const altLi = page.locator('#status li[data-equation="2E5M3"]');
      await expect(altLi).toBeVisible();
      const hrefs = await altLi.locator('use').evaluateAll(
        els => els.map(e => e.getAttribute('href'))
      );
      expect(hrefs).toContain('#c-E');
      expect(hrefs).toContain('#c-M');
    });

    test('clicking an alt-form solution normalises the input', async ({ page }) => {
      await page.locator('#equation').fill('2-5=3');
      await page.locator('#status li[data-equation="2E5M3"]').click();
      // Input should not contain alt chars (E, M canonicalise to =, -)
      const val = await page.locator('#equation').inputValue();
      expect(val).toBe('2=5-3');
      // But the preview should render the raw 2E5M3 form
      const previewHrefs = await page.locator('#preview use').evaluateAll(
        els => els.map(e => e.getAttribute('href'))
      );
      expect(previewHrefs).toContain('#c-E');
      expect(previewHrefs).toContain('#c-M');
    });
  });

  test('rules table shows alt-form rows under flexible', async ({ page }) => {
    await page.locator('input[value="flexible"]').check();
    // Each row's character cell has one SVG use; collect every char's id
    const charIds = await page.locator('tbody > tr > th use').evaluateAll(
      els => els.map(e => e.getAttribute('href'))
    );
    for (const id of ['#c-b', '#c-q', '#c-M', '#c-P', '#c-E']) {
      expect(charIds).toContain(id);
    }
  });
});
