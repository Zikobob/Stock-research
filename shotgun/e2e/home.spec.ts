import { expect, test } from '@playwright/test';

test('the home screen loads on a phone', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Shotgun' })).toBeVisible();
  await expect(page.getByText(/does not replace 911/i)).toBeVisible();
});

test('an unknown address shows a way back', async ({ page }) => {
  await page.goto('/no-such-page');
  await expect(page.getByRole('heading', { name: /page not found/i })).toBeVisible();
  await page.getByRole('link', { name: /back to home/i }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Shotgun' })).toBeVisible();
});
