const { test, expect } = require('@playwright/test');

test.describe('Auth E2E', () => {
  test('login page renders and validates required fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByTestId('login-page')).toBeVisible();
    await expect(page.getByTestId('auth-submit')).toBeVisible();
    await page.getByTestId('auth-submit').click();
    await expect(page.locator('input:invalid')).toHaveCount(2);
  });

  test('signup toggle shows name field and validates password minlength', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('switch-signup').click();
    await expect(page.getByTestId('signup-name')).toBeVisible();
    await page.getByTestId('signup-name').fill('Test User');
    await page.getByTestId('auth-email').fill('bad-email');
    await page.getByTestId('auth-password').fill('123');
    await page.getByTestId('auth-submit').click();
    await expect(page.locator('input:invalid')).not.toHaveCount(0);
  });

  test('invalid login shows error state from backend', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('auth-email').fill('notfound@example.com');
    await page.getByTestId('auth-password').fill('wrongpassword');
    await page.getByTestId('auth-submit').click();
    await expect(page.getByTestId('auth-error')).toBeVisible({ timeout: 10000 });
  });

  test('mobile viewport nav/auth page smoke', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByTestId('login-page')).toBeVisible();
    await expect(page.getByTestId('google-login-btn')).toBeVisible();
  });
});
