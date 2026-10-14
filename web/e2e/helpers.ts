import { test, expect, Page, BrowserContext, Locator } from '@playwright/test';

export const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:18081';

export function orText(page: Page, ...texts: string[]): Locator {
  let locator = page.getByText(texts[0], { exact: false });
  for (let i = 1; i < texts.length; i++) {
    locator = locator.or(page.getByText(texts[i], { exact: false }));
  }
  return locator.first();
}

export function orLocator(...locators: Locator[]): Locator {
  let result = locators[0];
  for (let i = 1; i < locators.length; i++) {
    result = result.or(locators[i]);
  }
  return result.first();
}

export function orRole(page: Page, role: string, ...names: string[]): Locator {
  let locator = page.getByRole(role as any, { name: names[0] });
  for (let i = 1; i < names.length; i++) {
    locator = locator.or(page.getByRole(role as any, { name: names[i] }));
  }
  return locator.first();
}

export async function login(page: Page, username = 'admin', password = 'test-password') {
  await page.goto(BASE_URL);
  await orRole(page, 'heading', 'mdock').waitFor({ state: 'visible', timeout: 10000 });
  await orLocator(
    page.locator('label:has-text("Логин") input'),
    page.locator('label:has-text("Login") input')
  ).fill(username);
  await orLocator(
    page.locator('label:has-text("Пароль") input[type="password"]'),
    page.locator('label:has-text("Password") input[type="password"]')
  ).fill(password);
  await orRole(page, 'button', 'Войти', 'Login').click();
  await orRole(page, 'heading', 'Хранилища', 'Vaults').waitFor({ state: 'visible', timeout: 15000 });
}

export async function logout(page: Page) {
  await orRole(page, 'button', 'Выйти', 'Logout').click();
  await orRole(page, 'heading', 'mdock').waitFor({ state: 'visible', timeout: 10000 });
}

export async function createVault(page: Page, name: string) {
  await orRole(page, 'button', 'Создать', 'Create').click();
  await orLocator(
    page.locator('input[name="vault-name"]'),
    page.locator('input[placeholder*="название" i]'),
    page.locator('input[placeholder*="name" i]')
  ).fill(name);
  await orRole(page, 'button', 'Создать', 'Create').click();
  await orText(page, name).waitFor({ state: 'visible', timeout: 10000 });
}

export async function openVault(page: Page, vaultName: string) {
  await orLocator(
    page.getByRole('button', { name: vaultName }),
    page.getByRole('link', { name: vaultName })
  ).click();
  await orRole(page, 'tab', 'Редактор', 'Editor').waitFor({ state: 'visible', timeout: 15000 });
}

export async function waitForEditor(page: Page) {
  await page.locator('.markdown-editor-shell, [class*="editor"]').first().waitFor({ state: 'visible', timeout: 15000 });
}

export async function createFile(page: Page, fileName: string, basePath = '.') {
  page.once('dialog', dialog => dialog.accept(fileName));
  const createFileButton = page.getByRole('button', { name: 'Создать файл' });
  await createFileButton.click();
  await orText(page, fileName).waitFor({ state: 'visible', timeout: 5000 });
}

export async function createFolder(page: Page, folderName: string, basePath = '.') {
  page.once('dialog', dialog => dialog.accept(folderName));
  const createFolderButton = page.getByRole('button', { name: 'Создать папку' });
  await createFolderButton.click();
  await orText(page, folderName).waitFor({ state: 'visible', timeout: 5000 });
}

export async function openFile(page: Page, fileName: string) {
  await page.getByRole('link', { name: fileName }).click();
  await page.locator('.markdown-editor-shell, [class*="editor"]').first().waitFor({ state: 'visible', timeout: 15000 });
}

export async function enableEditing(page: Page) {
  const editCheckbox = page.getByRole('checkbox', { name: 'Редактирование' });
  if (await editCheckbox.isVisible()) {
    await editCheckbox.check();
    await orText(page, 'Lock активен', 'Lock active', 'Редактирование активно').waitFor({ state: 'visible', timeout: 15000 });
  }
}

export async function disableEditing(page: Page) {
  const editCheckbox = page.getByRole('checkbox', { name: 'Редактирование' });
  if (await editCheckbox.isVisible()) {
    await editCheckbox.uncheck();
  }
}

export async function saveFile(page: Page) {
  await orRole(page, 'button', 'Сохранить', 'Save').click();
  await orText(page, 'Сохранено', 'Saved').waitFor({ state: 'visible', timeout: 15000 });
}

export async function switchViewMode(page: Page, mode: 'rendered' | 'plain' | 'split') {
  const labels = {
    rendered: ['Просмотр', 'Rendered'],
    plain: ['Исходник', 'Source', 'Plain'],
    split: ['Две панели', 'Split'],
  };
  for (const label of labels[mode]) {
    const button = page.getByRole('tab', { name: label });
    if (await button.isVisible({ timeout: 1000 })) {
      await button.click();
      return;
    }
  }
}

export async function deleteFile(page: Page, fileName: string) {
  // Find the file row and click the delete button within it
  const fileRow = page.locator(`[class*="file-row"]:has-text("${fileName}")`).first();
  const deleteButton = fileRow.locator('button[title*="удалить" i], button[title*="delete" i], button[aria-label*="удалить" i], button[aria-label*="delete" i]').first();
  await deleteButton.click();
  await orRole(page, 'button', 'Удалить', 'Delete', 'Да', 'Yes').click();
  await orText(page, fileName).waitFor({ state: 'hidden', timeout: 5000 });
}

export async function toggleSidebar(page: Page) {
  await orRole(page, 'button', 'Скрыть файлы', 'Hide files', 'Показать файлы', 'Show files').click();
}

export async function goToSection(page: Page, section: 'editor' | 'activity' | 'settings') {
  const labels = {
    editor: ['Редактор', 'Editor'],
    activity: ['activity', 'Activity', 'Активность'],
    settings: ['Настройки хранилища', 'Settings', 'Настройки'],
  };
  for (const label of labels[section]) {
    const tab = page.getByRole('tab', { name: label });
    if (await tab.isVisible({ timeout: 1000 })) {
      await tab.click();
      return;
    }
  }
}

export async function renameVault(page: Page, newName: string) {
  await goToSection(page, 'settings');
  await orLocator(
    page.locator('input[name="vault-name"]'),
    page.locator('input[placeholder*="название" i]')
  ).fill(newName);
  await orRole(page, 'button', 'Сохранить', 'Save').click();
  await orText(page, newName).waitFor({ state: 'visible', timeout: 5000 });
}

export async function archiveVault(page: Page) {
  const archiveButton = orRole(page, 'button', 'В архив', 'Archive');
  if (await archiveButton.isVisible()) {
    await archiveButton.click();
    await orRole(page, 'button', 'Да', 'Yes', 'Подтвердить', 'Confirm').click();
    await orText(page, 'Архив', 'Archive').waitFor({ state: 'visible', timeout: 5000 });
  }
}

export async function unarchiveVault(page: Page) {
  const unarchiveButton = orRole(page, 'button', 'Восстановить', 'Restore');
  if (await unarchiveButton.isVisible()) {
    await unarchiveButton.click();
    await orText(page, 'Активные', 'Active').waitFor({ state: 'visible', timeout: 5000 });
  }
}

export async function copyWebDAVURL(page: Page) {
  await page.getByRole('button', { name: 'Скопировать WebDAV URL' }).click();
}

export async function setGitRemote(page: Page, url: string) {
  await goToSection(page, 'settings');
  await orLocator(
    page.locator('input[placeholder*="git" i]'),
    page.locator('input[placeholder*="remote" i]'),
    page.locator('input[name="remote-url"]')
  ).fill(url);
  await orRole(page, 'button', 'Сохранить', 'Save').click();
  await orText(page, 'Сохранено', 'Saved').waitFor({ state: 'visible', timeout: 15000 });
}

export async function pushGitRemote(page: Page) {
  await goToSection(page, 'settings');
  await orRole(page, 'button', 'Push', 'Отправить').click();
  await orText(page, 'Отправлено', 'Pushed', 'Готово', 'Done').waitFor({ state: 'visible', timeout: 30000 });
}

export async function openThemeSettings(page: Page) {
  await orLocator(
    page.locator('button[aria-label*="тема" i]'),
    page.locator('button[title*="тема" i]'),
    page.getByRole('button', { name: 'Настройки темы' })
  ).click();
}

export async function setTheme(page: Page, theme: 'dark' | 'light' | 'warm' | 'black') {
  await openThemeSettings(page);
  await page.getByRole('button', { name: theme.charAt(0).toUpperCase() + theme.slice(1) }).click();
}

export async function setAccent(page: Page, accent: string) {
  await openThemeSettings(page);
  await page.getByRole('button', { name: accent.charAt(0).toUpperCase() + accent.slice(1) }).click();
}

export async function setLanguage(page: Page, lang: 'ru' | 'en') {
  await orLocator(
    page.locator('button[aria-label*="язык" i]'),
    page.locator('button[title*="язык" i]'),
    page.getByRole('button', { name: 'Русский' }),
    page.getByRole('button', { name: 'English' })
  ).click();
  await page.getByRole('button', { name: lang === 'ru' ? 'Русский' : 'English' }).click();
}