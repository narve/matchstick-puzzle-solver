import { test, expect } from '@playwright/test';

// Tests for the standalone puzzle.html page.

test.describe('puzzle.html', () => {

  test.describe('single-puzzle mode', () => {
    test('renders the puzzle and a working Show-me button', async ({ page }) => {
      await page.goto('/puzzle.html?puzzle=6%2B4%3D4');
      await expect(page).toHaveTitle('6+4=4 — Matchstick puzzle');
      await expect(page.locator('#title')).toHaveText('Puzzle: 6+4=4');
      // Big preview SVG renders (6+4=4 has 5 chars; 2+5+5 = 16 char-symbols
      // but spaces/diagonals can vary — just assert at least one <use>).
      await expect(page.locator('#preview svg').first()).toBeVisible();
      // Show-me wires up the addressable-stick SVG.
      await expect(page.locator('#solve-btn')).toHaveText('Show me!');
      await expect(page.locator('#anim-area svg.equation-anim')).toBeVisible();
    });

    test('clicking Show me animates and switches the button to Reset', async ({ page }) => {
      await page.goto('/puzzle.html?puzzle=6%2B4%3D4');
      await page.locator('#solve-btn').click();
      // The animation runs ~2.4s; wait for the label to flip.
      await expect(page.locator('#solve-btn')).toHaveText('Reset', { timeout: 5000 });
    });

    test('valid (true) equations show a "already true" note, no Show-me', async ({ page }) => {
      await page.goto('/puzzle.html?puzzle=1%2B1%3D2');
      await expect(page.locator('#status')).toContainText('already true');
      await expect(page.locator('#solve-btn')).toBeHidden();
      await expect(page.locator('#anim-area')).toBeHidden();
    });

    test('puzzle with no solution shows a clear note', async ({ page }) => {
      // Under strict, the leading-minus boundary rule is off, so a
      // puzzle that only solves via boundary moves has no solution.
      await page.goto('/puzzle.html?puzzle=1%2B2%3D7&ruleset=strict');
      await expect(page.locator('#status')).toContainText('No single-stick solution');
      await expect(page.locator('#solve-btn')).toBeHidden();
    });

    test('missing puzzle param shows the invalid message', async ({ page }) => {
      await page.goto('/puzzle.html');
      await expect(page.locator('#invalid-message')).toBeVisible();
      await expect(page.locator('#invalid-message')).toContainText('No puzzle given');
      await expect(page.locator('#puzzle-area')).toBeHidden();
    });

    test('illegal characters in puzzle show the invalid message', async ({ page }) => {
      await page.goto('/puzzle.html?puzzle=hello');
      await expect(page.locator('#invalid-message')).toBeVisible();
      await expect(page.locator('#invalid-message')).toContainText("aren't allowed");
    });

    test('unknown ruleset value shows the invalid message', async ({ page }) => {
      await page.goto('/puzzle.html?puzzle=1%2B1%3D2&ruleset=bogus');
      await expect(page.locator('#invalid-message')).toBeVisible();
      await expect(page.locator('#invalid-message')).toContainText('Unknown ruleset');
    });

    test('journey-nav is hidden when no puzzle-set is given', async ({ page }) => {
      await page.goto('/puzzle.html?puzzle=6%2B4%3D4');
      await expect(page.locator('#journey-nav')).toBeHidden();
    });

    test('"Show me the rules!" disclosure renders the rules table for the active ruleset', async ({ page }) => {
      await page.goto('/puzzle.html?puzzle=1%2B3%2B7%3D9&ruleset=flexible');
      const toggle = page.locator('#rules-toggle');
      await expect(toggle).toBeVisible();
      await expect(page.locator('#rules-ruleset-name')).toHaveText('flexible');
      // Closed by default
      await expect(toggle).not.toHaveAttribute('open', '');
      // Open and check rows render
      await page.locator('#rules-toggle > summary').click();
      // Flexible adds alt-form characters → at least a digit row exists
      await expect(page.locator('#rules-body tr')).not.toHaveCount(0);
    });
  });

  test.describe('puzzle-set (journey) mode', () => {
    test('?puzzle-set=n1 loads the first puzzle and shows the set name', async ({ page }) => {
      await page.goto('/puzzle.html?puzzle-set=n1');
      await expect(page.locator('#title')).toContainText('Narves 1st puzzle set!');
      await expect(page.locator('#title')).toContainText('Puzzle: 6+4=4');
      await expect(page.locator('#journey-nav')).toBeVisible();
      await expect(page.locator('#journey-pos')).toHaveText('1 / 28');
      await expect(page.locator('#prev-btn')).toBeDisabled();
      await expect(page.locator('#next-btn')).toBeEnabled();
    });

    test('Next navigates to the next puzzle and bumps the position counter', async ({ page }) => {
      await page.goto('/puzzle.html?puzzle-set=n1');
      await page.locator('#next-btn').click();
      await expect(page).toHaveURL(/puzzle=6-2%3D7&puzzle-set=n1/);
      await expect(page.locator('#journey-pos')).toHaveText('2 / 28');
      await expect(page.locator('#prev-btn')).toBeEnabled();
    });

    test('Prev navigates back', async ({ page }) => {
      await page.goto('/puzzle.html?puzzle=6-2%3D7&puzzle-set=n1');
      await page.locator('#prev-btn').click();
      await expect(page.locator('#journey-pos')).toHaveText('1 / 28');
      await expect(page.locator('#prev-btn')).toBeDisabled();
    });

    test('last puzzle in set has Next disabled', async ({ page }) => {
      // 1+3+7=9 is the 28th sample (last flexible/hard).
      await page.goto('/puzzle.html?puzzle=1%2B3%2B7%3D9&puzzle-set=n1');
      await expect(page.locator('#journey-pos')).toHaveText('28 / 28');
      await expect(page.locator('#next-btn')).toBeDisabled();
      await expect(page.locator('#prev-btn')).toBeEnabled();
    });

    test('set entry ruleset wins over URL ruleset param', async ({ page }) => {
      // 1+3+7=9 is tagged flexible in the set; URL ruleset=strict is ignored.
      await page.goto('/puzzle.html?puzzle=1%2B3%2B7%3D9&puzzle-set=n1&ruleset=strict');
      await expect(page.locator('#rules-ruleset-name')).toHaveText('flexible');
    });

    test('unknown puzzle-set id shows the invalid message', async ({ page }) => {
      await page.goto('/puzzle.html?puzzle-set=does-not-exist');
      await expect(page.locator('#invalid-message')).toBeVisible();
      await expect(page.locator('#invalid-message')).toContainText('Unknown puzzle set');
    });

    test('puzzle not in the named set shows the invalid message', async ({ page }) => {
      // 9+9=9 is not a sample (and not in any set).
      await page.goto('/puzzle.html?puzzle=9%2B9%3D9&puzzle-set=n1');
      await expect(page.locator('#invalid-message')).toBeVisible();
      await expect(page.locator('#invalid-message')).toContainText('is not part of');
    });
  });

});
