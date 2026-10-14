import { test, expect } from '@playwright/test';
import { login, logout, BASE_URL, orRole, orText } from './helpers';

test.describe('Authentication', () => {
  test('should show login form when not authenticated', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(orRole(page, 'heading', 'mdock')).toBeVisible();
    await expect(page.locator('label:has-text("Логин") input').or(page.locator('label:has-text("Login") input'))).toBeVisible();
    await expect(page.locator('label:has-text("Пароль") input[type="password"]').or(page.locator('label:has-text("Password") input[type="password"]'))).toBeVisible();
    await expect(orRole(page, 'button', 'Войти', 'Login')).toBeVisible();
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await login(page);
    await expect(orRole(page, 'heading', 'Хранилища', 'Vaults')).toBeVisible();
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.locator('label:has-text("Логин") input').or(page.locator('label:has-text("Login") input')).fill('wrong');
    await page.locator('label:has-text("Пароль") input[type="password"]').or(page.locator('label:has-text("Password") input[type="password"]')).fill('wrong');
    await orRole(page, 'button', 'Войти', 'Login').click();
    await expect(orText(page, 'Не удалось выполнить вход', 'Failed to log in', 'Ошибка', 'Error', 'Неверный', 'Invalid')).toBeVisible({ timeout: 5000 });
  });

  test('should logout successfully', async ({ page }) => {
    await login(page);
    await logout(page);
    await expect(orRole(page, 'heading', 'mdock')).toBeVisible();
    await expect(page.locator('label:has-text("Логин") input').or(page.locator('label:has-text("Login") input'))).toBeVisible();
  });

  test('should redirect to login when accessing protected page', async ({ page }) => {
    await page.goto(`${BASE_URL}/?page=vault&slug=test`);
    await expect(orRole(page, 'heading', 'mdock')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('label:has-text("Логин") input').or(page.locator('label:has-text("Login") input'))).toBeVisible();
  });
});