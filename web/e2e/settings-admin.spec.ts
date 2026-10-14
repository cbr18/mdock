import { test, expect } from '@playwright/test';
import { login, logout, BASE_URL, setTheme, setAccent, setLanguage } from './helpers';

test.describe('Theme and Language Settings', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should open theme settings', async ({ page }) => {
    await page.click('button[aria-label*="тема" i], button[title*="тема" i], button:has-text("Настройки темы")');
    await expect(page.locator('text=Тема, text=Theme')).toBeVisible();
  });

  test('should change theme', async ({ page }) => {
    await setTheme(page, 'light');
    await expect(page.locator('[data-theme="light"], .theme-light')).toBeVisible();
    await setTheme(page, 'dark');
    await expect(page.locator('[data-theme="dark"], .theme-dark')).toBeVisible();
  });

  test('should change accent color', async ({ page }) => {
    await setAccent(page, 'blue');
    await expect(page.locator('[data-accent="blue"], .accent-blue')).toBeVisible();
    await setAccent(page, 'violet');
    await expect(page.locator('[data-accent="violet"], .accent-violet')).toBeVisible();
  });

  test('should persist theme in localStorage', async ({ page }) => {
    await setTheme(page, 'light');
    await setAccent(page, 'green');
    await page.reload();
    await expect(page.locator('[data-theme="light"], .theme-light')).toBeVisible();
    await expect(page.locator('[data-accent="green"], .accent-green')).toBeVisible();
  });

  test('should change language to English', async ({ page }) => {
    await setLanguage(page, 'en');
    await expect(page.locator('text=Vaults, text=Settings, text=Login')).toBeVisible({ timeout: 5000 });
  });

  test('should change language to Russian', async ({ page }) => {
    await setLanguage(page, 'ru');
    await expect(page.locator('text=Хранилища, text=Настройки, text=Войти')).toBeVisible({ timeout: 5000 });
  });

  test('should persist language in localStorage', async ({ page }) => {
    await setLanguage(page, 'en');
    await page.reload();
    await expect(page.locator('text=Vaults')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Navigation and UI', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should show topbar with user info', async ({ page }) => {
    await expect(page.locator('text=admin')).toBeVisible();
    await expect(page.locator('button:has-text("Выйти"), button:has-text("Logout")')).toBeVisible();
  });

  test('should navigate to account page', async ({ page }) => {
    await page.click('a:has-text("Аккаунт"), a:has-text("Account")');
    await expect(page.locator('text=Аккаунт, text=Account')).toBeVisible();
    await expect(page.locator('text=Сменить пароль, text=Change password')).toBeVisible();
  });

  test('should navigate to admin users page (if admin)', async ({ page }) => {
    await page.click('a:has-text("Пользователи"), a:has-text("Users")');
    await expect(page.locator('text=Пользователи, text=Users')).toBeVisible();
  });

  test('should reset scroll position on navigation', async ({ page }) => {
    const initialScroll = await page.evaluate(() => window.scrollY);
    await page.click('a:has-text("Аккаунт"), a:has-text("Account")');
    const afterScroll = await page.evaluate(() => window.scrollY);
    expect(afterScroll).toBe(0);
  });
});

test.describe('Account Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.click('a:has-text("Аккаунт"), a:has-text("Account")');
  });

  test('should show account page', async ({ page }) => {
    await expect(page.locator('text=Аккаунт, text=Account')).toBeVisible();
  });

  test('should show change password form', async ({ page }) => {
    await expect(page.locator('text=Сменить пароль, text=Change password')).toBeVisible();
    await expect(page.locator('input[name="current_password"], input[placeholder*="текущий" i]')).toBeVisible();
    await expect(page.locator('input[name="new_password"], input[placeholder*="новый" i]')).toBeVisible();
    await expect(page.locator('input[name="confirm_password"], input[placeholder*="подтверд" i]')).toBeVisible();
  });

  test('should change password', async ({ page }) => {
    await page.fill('input[name="current_password"], input[placeholder*="текущий" i]', 'test-password');
    await page.fill('input[name="new_password"], input[placeholder*="новый" i]', 'new-test-password');
    await page.fill('input[name="confirm_password"], input[placeholder*="подтверд" i]', 'new-test-password');
    await page.click('button:has-text("Сохранить"), button:has-text("Save")');
    await expect(page.locator('text=Пароль изменен, text=Password changed')).toBeVisible({ timeout: 5000 });

    // Login with new password
    await logout(page);
    await login(page, 'admin', 'new-test-password');
    await expect(page.locator('text=Хранилища, text=Vaults')).toBeVisible();

    // Change back
    await page.click('a:has-text("Аккаунт"), a:has-text("Account")');
    await page.fill('input[name="current_password"], input[placeholder*="текущий" i]', 'new-test-password');
    await page.fill('input[name="new_password"], input[placeholder*="новый" i]', 'test-password');
    await page.fill('input[name="confirm_password"], input[placeholder*="подтверд" i]', 'test-password');
    await page.click('button:has-text("Сохранить"), button:has-text("Save")');
    await expect(page.locator('text=Пароль изменен, text=Password changed')).toBeVisible({ timeout: 5000 });
  });

  test('should show error on wrong current password', async ({ page }) => {
    await page.fill('input[name="current_password"], input[placeholder*="текущий" i]', 'wrong');
    await page.fill('input[name="new_password"], input[placeholder*="новый" i]', 'new-pass');
    await page.fill('input[name="confirm_password"], input[placeholder*="подтверд" i]', 'new-pass');
    await page.click('button:has-text("Сохранить"), button:has-text("Save")');
    await expect(page.locator('text=Ошибка, text=Error, text=Неверный, text=Invalid')).toBeVisible({ timeout: 5000 });
  });

  test('should show error on password mismatch', async ({ page }) => {
    await page.fill('input[name="current_password"], input[placeholder*="текущий" i]', 'test-password');
    await page.fill('input[name="new_password"], input[placeholder*="новый" i]', 'new-pass-1');
    await page.fill('input[name="confirm_password"], input[placeholder*="подтверд" i]', 'new-pass-2');
    await page.click('button:has-text("Сохранить"), button:has-text("Save")');
    await expect(page.locator('text=не совпадают, text=mismatch, text=Match')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Admin Users Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.click('a:has-text("Пользователи"), a:has-text("Users")');
  });

  test('should show admin users page', async ({ page }) => {
    await expect(page.locator('text=Пользователи, text=Users')).toBeVisible();
  });

  test('should show user list with admin', async ({ page }) => {
    await expect(page.locator('text=admin')).toBeVisible();
    await expect(page.locator('text=Администратор, text=Admin')).toBeVisible();
  });

  test('should create new user', async ({ page }) => {
    const userName = `testuser-${Date.now()}`;
    await page.click('button:has-text("Создать пользователя"), button:has-text("Create user")');
    await page.fill('input[name="username"], input[placeholder*="логин" i]', userName);
    await page.fill('input[name="password"], input[placeholder*="парол" i]', 'user-password');
    await page.click('button:has-text("Создать"), button:has-text("Create")');
    await expect(page.locator(`text=${userName}`)).toBeVisible({ timeout: 5000 });
  });

  test('should disable and enable user', async ({ page }) => {
    const userName = `testuser-${Date.now()}`;
    await page.click('button:has-text("Создать пользователя"), button:has-text("Create user")');
    await page.fill('input[name="username"], input[placeholder*="логин" i]', userName);
    await page.fill('input[name="password"], input[placeholder*="парол" i]', 'user-password');
    await page.click('button:has-text("Создать"), button:has-text("Create")');
    await expect(page.locator(`text=${userName}`)).toBeVisible({ timeout: 5000 });

    await page.click(`button[title*="отключить" i][title*="${userName}"], button[title*="disable" i][title*="${userName}"]`);
    await expect(page.locator(`text=${userName}`).locator('..').locator('text=Отключен, text=Disabled')).toBeVisible({ timeout: 5000 });

    await page.click(`button[title*="включить" i][title*="${userName}"], button[title*="enable" i][title*="${userName}"]`);
    await expect(page.locator(`text=${userName}`).locator('..').locator('text=Активен, text=Active')).toBeVisible({ timeout: 5000 });
  });

  test('should reset user password', async ({ page }) => {
    const userName = `testuser-${Date.now()}`;
    await page.click('button:has-text("Создать пользователя"), button:has-text("Create user")');
    await page.fill('input[name="username"], input[placeholder*="логин" i]', userName);
    await page.fill('input[name="password"], input[placeholder*="парол" i]', 'user-password');
    await page.click('button:has-text("Создать"), button:has-text("Create")');
    await expect(page.locator(`text=${userName}`)).toBeVisible({ timeout: 5000 });

    await page.click(`button[title*="парол" i][title*="${userName}"], button[title*="password" i][title*="${userName}"]`);
    await page.fill('input[name="password"], input[placeholder*="парол" i]', 'new-user-password');
    await page.click('button:has-text("Сохранить"), button:has-text("Save")');
    await expect(page.locator('text=Пароль изменен, text=Password changed')).toBeVisible({ timeout: 5000 });
  });

  test('should revoke user sessions', async ({ page }) => {
    const userName = `testuser-${Date.now()}`;
    await page.click('button:has-text("Создать пользователя"), button:has-text("Create user")');
    await page.fill('input[name="username"], input[placeholder*="логин" i]', userName);
    await page.fill('input[name="password"], input[placeholder*="парол" i]', 'user-password');
    await page.click('button:has-text("Создать"), button:has-text("Create")');
    await expect(page.locator(`text=${userName}`)).toBeVisible({ timeout: 5000 });

    await page.click(`button[title*="сесси" i][title*="${userName}"], button[title*="session" i][title*="${userName}"]`);
    await expect(page.locator('text=Сессии отозваны, text=Sessions revoked')).toBeVisible({ timeout: 5000 });
  });

  test('should not allow admin to disable themselves', async ({ page }) => {
    await page.click(`button[title*="отключить" i][title*="admin"], button[title*="disable" i][title*="admin"]`);
    await expect(page.locator('text=Ошибка, text=Error, text=Нельзя, text=Cannot')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Error Handling and Edge Cases', () => {
  test('should handle 404 pages gracefully', async ({ page }) => {
    await page.goto(`${BASE_URL}/?page=nonexistent`);
    await expect(page.locator('text=mdock')).toBeVisible({ timeout: 5000 });
  });

  test('should handle network errors', async ({ page }) => {
    await login(page);
    await page.route('**/api/**', route => route.abort());
    await page.reload();
    await expect(page.locator('text=Ошибка, text=Error, text=Сеть, text=Network')).toBeVisible({ timeout: 10000 });
  });

  test('should show loading states', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('[aria-busy="true"], text=Загрузка, text=Loading')).toBeVisible({ timeout: 5000 });
  });

  test('should handle empty vault gracefully', async ({ page }) => {
    await login(page);
    const vaultName = `Empty Vault ${Date.now()}`;
    await page.click('button:has-text("Создать хранилище"), button:has-text("Create vault")');
    await page.fill('input[name="vault-name"], input[placeholder*="название" i]', vaultName);
    await page.click('button:has-text("Создать"), button:has-text("Create")');
    await page.click(`button:has-text("${vaultName}")`);
    await expect(page.locator('text=Файлов нет, text=No files, text=noFiles')).toBeVisible({ timeout: 10000 });
  });
});