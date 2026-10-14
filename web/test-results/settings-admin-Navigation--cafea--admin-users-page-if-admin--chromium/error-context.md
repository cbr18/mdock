# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: settings-admin.spec.ts >> Navigation and UI >> should navigate to admin users page (if admin)
- Location: e2e/settings-admin.spec.ts:69:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Пользователи, text=Users')
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('text=Пользователи, text=Users') with timeout 10000ms
  - waiting for locator('text=Пользователи, text=Users')

```

```yaml
- link "Перейти к содержимому":
  - /url: "#main-content"
- main:
  - link "Dashboard":
    - /url: /
    - text: mdock
  - navigation "Основная навигация":
    - link "Хранилища":
      - /url: /
    - link "Пользователи":
      - /url: /?page=admin-users
    - link "Аккаунт":
      - /url: /?page=account
  - group
  - button "English"
  - text: admin
  - button "Выйти"
  - heading "Пользователи" [level=2]
  - heading "Создать пользователя" [level=3]
  - text: Логин
  - textbox "Логин"
  - text: Пароль
  - textbox "Пароль"
  - button "Создать"
  - heading "Аккаунты" [level=3]
  - article:
    - strong: admin
    - paragraph: Админ · включён
    - textbox "Новый пароль admin":
      - /placeholder: Новый пароль
    - button "Изменить пароль admin"
    - button "Отозвать сессии admin"
    - button "Отключить admin"
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { login, logout, BASE_URL, setTheme, setAccent, setLanguage } from './helpers';
  3   | 
  4   | test.describe('Theme and Language Settings', () => {
  5   |   test.beforeEach(async ({ page }) => {
  6   |     await login(page);
  7   |   });
  8   | 
  9   |   test('should open theme settings', async ({ page }) => {
  10  |     await page.click('button[aria-label*="тема" i], button[title*="тема" i], button:has-text("Настройки темы")');
  11  |     await expect(page.locator('text=Тема, text=Theme')).toBeVisible();
  12  |   });
  13  | 
  14  |   test('should change theme', async ({ page }) => {
  15  |     await setTheme(page, 'light');
  16  |     await expect(page.locator('[data-theme="light"], .theme-light')).toBeVisible();
  17  |     await setTheme(page, 'dark');
  18  |     await expect(page.locator('[data-theme="dark"], .theme-dark')).toBeVisible();
  19  |   });
  20  | 
  21  |   test('should change accent color', async ({ page }) => {
  22  |     await setAccent(page, 'blue');
  23  |     await expect(page.locator('[data-accent="blue"], .accent-blue')).toBeVisible();
  24  |     await setAccent(page, 'violet');
  25  |     await expect(page.locator('[data-accent="violet"], .accent-violet')).toBeVisible();
  26  |   });
  27  | 
  28  |   test('should persist theme in localStorage', async ({ page }) => {
  29  |     await setTheme(page, 'light');
  30  |     await setAccent(page, 'green');
  31  |     await page.reload();
  32  |     await expect(page.locator('[data-theme="light"], .theme-light')).toBeVisible();
  33  |     await expect(page.locator('[data-accent="green"], .accent-green')).toBeVisible();
  34  |   });
  35  | 
  36  |   test('should change language to English', async ({ page }) => {
  37  |     await setLanguage(page, 'en');
  38  |     await expect(page.locator('text=Vaults, text=Settings, text=Login')).toBeVisible({ timeout: 5000 });
  39  |   });
  40  | 
  41  |   test('should change language to Russian', async ({ page }) => {
  42  |     await setLanguage(page, 'ru');
  43  |     await expect(page.locator('text=Хранилища, text=Настройки, text=Войти')).toBeVisible({ timeout: 5000 });
  44  |   });
  45  | 
  46  |   test('should persist language in localStorage', async ({ page }) => {
  47  |     await setLanguage(page, 'en');
  48  |     await page.reload();
  49  |     await expect(page.locator('text=Vaults')).toBeVisible({ timeout: 5000 });
  50  |   });
  51  | });
  52  | 
  53  | test.describe('Navigation and UI', () => {
  54  |   test.beforeEach(async ({ page }) => {
  55  |     await login(page);
  56  |   });
  57  | 
  58  |   test('should show topbar with user info', async ({ page }) => {
  59  |     await expect(page.locator('text=admin')).toBeVisible();
  60  |     await expect(page.locator('button:has-text("Выйти"), button:has-text("Logout")')).toBeVisible();
  61  |   });
  62  | 
  63  |   test('should navigate to account page', async ({ page }) => {
  64  |     await page.click('a:has-text("Аккаунт"), a:has-text("Account")');
  65  |     await expect(page.locator('text=Аккаунт, text=Account')).toBeVisible();
  66  |     await expect(page.locator('text=Сменить пароль, text=Change password')).toBeVisible();
  67  |   });
  68  | 
  69  |   test('should navigate to admin users page (if admin)', async ({ page }) => {
  70  |     await page.click('a:has-text("Пользователи"), a:has-text("Users")');
> 71  |     await expect(page.locator('text=Пользователи, text=Users')).toBeVisible();
      |                                                                 ^ Error: expect(locator).toBeVisible() failed
  72  |   });
  73  | 
  74  |   test('should reset scroll position on navigation', async ({ page }) => {
  75  |     const initialScroll = await page.evaluate(() => window.scrollY);
  76  |     await page.click('a:has-text("Аккаунт"), a:has-text("Account")');
  77  |     const afterScroll = await page.evaluate(() => window.scrollY);
  78  |     expect(afterScroll).toBe(0);
  79  |   });
  80  | });
  81  | 
  82  | test.describe('Account Page', () => {
  83  |   test.beforeEach(async ({ page }) => {
  84  |     await login(page);
  85  |     await page.click('a:has-text("Аккаунт"), a:has-text("Account")');
  86  |   });
  87  | 
  88  |   test('should show account page', async ({ page }) => {
  89  |     await expect(page.locator('text=Аккаунт, text=Account')).toBeVisible();
  90  |   });
  91  | 
  92  |   test('should show change password form', async ({ page }) => {
  93  |     await expect(page.locator('text=Сменить пароль, text=Change password')).toBeVisible();
  94  |     await expect(page.locator('input[name="current_password"], input[placeholder*="текущий" i]')).toBeVisible();
  95  |     await expect(page.locator('input[name="new_password"], input[placeholder*="новый" i]')).toBeVisible();
  96  |     await expect(page.locator('input[name="confirm_password"], input[placeholder*="подтверд" i]')).toBeVisible();
  97  |   });
  98  | 
  99  |   test('should change password', async ({ page }) => {
  100 |     await page.fill('input[name="current_password"], input[placeholder*="текущий" i]', 'test-password');
  101 |     await page.fill('input[name="new_password"], input[placeholder*="новый" i]', 'new-test-password');
  102 |     await page.fill('input[name="confirm_password"], input[placeholder*="подтверд" i]', 'new-test-password');
  103 |     await page.click('button:has-text("Сохранить"), button:has-text("Save")');
  104 |     await expect(page.locator('text=Пароль изменен, text=Password changed')).toBeVisible({ timeout: 5000 });
  105 | 
  106 |     // Login with new password
  107 |     await logout(page);
  108 |     await login(page, 'admin', 'new-test-password');
  109 |     await expect(page.locator('text=Хранилища, text=Vaults')).toBeVisible();
  110 | 
  111 |     // Change back
  112 |     await page.click('a:has-text("Аккаунт"), a:has-text("Account")');
  113 |     await page.fill('input[name="current_password"], input[placeholder*="текущий" i]', 'new-test-password');
  114 |     await page.fill('input[name="new_password"], input[placeholder*="новый" i]', 'test-password');
  115 |     await page.fill('input[name="confirm_password"], input[placeholder*="подтверд" i]', 'test-password');
  116 |     await page.click('button:has-text("Сохранить"), button:has-text("Save")');
  117 |     await expect(page.locator('text=Пароль изменен, text=Password changed')).toBeVisible({ timeout: 5000 });
  118 |   });
  119 | 
  120 |   test('should show error on wrong current password', async ({ page }) => {
  121 |     await page.fill('input[name="current_password"], input[placeholder*="текущий" i]', 'wrong');
  122 |     await page.fill('input[name="new_password"], input[placeholder*="новый" i]', 'new-pass');
  123 |     await page.fill('input[name="confirm_password"], input[placeholder*="подтверд" i]', 'new-pass');
  124 |     await page.click('button:has-text("Сохранить"), button:has-text("Save")');
  125 |     await expect(page.locator('text=Ошибка, text=Error, text=Неверный, text=Invalid')).toBeVisible({ timeout: 5000 });
  126 |   });
  127 | 
  128 |   test('should show error on password mismatch', async ({ page }) => {
  129 |     await page.fill('input[name="current_password"], input[placeholder*="текущий" i]', 'test-password');
  130 |     await page.fill('input[name="new_password"], input[placeholder*="новый" i]', 'new-pass-1');
  131 |     await page.fill('input[name="confirm_password"], input[placeholder*="подтверд" i]', 'new-pass-2');
  132 |     await page.click('button:has-text("Сохранить"), button:has-text("Save")');
  133 |     await expect(page.locator('text=не совпадают, text=mismatch, text=Match')).toBeVisible({ timeout: 5000 });
  134 |   });
  135 | });
  136 | 
  137 | test.describe('Admin Users Page', () => {
  138 |   test.beforeEach(async ({ page }) => {
  139 |     await login(page);
  140 |     await page.click('a:has-text("Пользователи"), a:has-text("Users")');
  141 |   });
  142 | 
  143 |   test('should show admin users page', async ({ page }) => {
  144 |     await expect(page.locator('text=Пользователи, text=Users')).toBeVisible();
  145 |   });
  146 | 
  147 |   test('should show user list with admin', async ({ page }) => {
  148 |     await expect(page.locator('text=admin')).toBeVisible();
  149 |     await expect(page.locator('text=Администратор, text=Admin')).toBeVisible();
  150 |   });
  151 | 
  152 |   test('should create new user', async ({ page }) => {
  153 |     const userName = `testuser-${Date.now()}`;
  154 |     await page.click('button:has-text("Создать пользователя"), button:has-text("Create user")');
  155 |     await page.fill('input[name="username"], input[placeholder*="логин" i]', userName);
  156 |     await page.fill('input[name="password"], input[placeholder*="парол" i]', 'user-password');
  157 |     await page.click('button:has-text("Создать"), button:has-text("Create")');
  158 |     await expect(page.locator(`text=${userName}`)).toBeVisible({ timeout: 5000 });
  159 |   });
  160 | 
  161 |   test('should disable and enable user', async ({ page }) => {
  162 |     const userName = `testuser-${Date.now()}`;
  163 |     await page.click('button:has-text("Создать пользователя"), button:has-text("Create user")');
  164 |     await page.fill('input[name="username"], input[placeholder*="логин" i]', userName);
  165 |     await page.fill('input[name="password"], input[placeholder*="парол" i]', 'user-password');
  166 |     await page.click('button:has-text("Создать"), button:has-text("Create")');
  167 |     await expect(page.locator(`text=${userName}`)).toBeVisible({ timeout: 5000 });
  168 | 
  169 |     await page.click(`button[title*="отключить" i][title*="${userName}"], button[title*="disable" i][title*="${userName}"]`);
  170 |     await expect(page.locator(`text=${userName}`).locator('..').locator('text=Отключен, text=Disabled')).toBeVisible({ timeout: 5000 });
  171 | 
```