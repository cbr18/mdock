import { test, expect } from '@playwright/test';
import { login, createVault, openVault, logout, BASE_URL, orRole, orText, orLocator } from './helpers';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display vault list', async ({ page }) => {
    await expect(orRole(page, 'heading', 'Хранилища', 'Vaults')).toBeVisible();
    await expect(orRole(page, 'tab', 'Активные', 'Active')).toBeVisible();
    await expect(orRole(page, 'tab', 'Архив', 'Archive')).toBeVisible();
  });

  test('should create a new vault', async ({ page }) => {
    const vaultName = `Test Vault ${Date.now()}`;
    await createVault(page, vaultName);
    await expect(orText(page, vaultName)).toBeVisible();
  });

  test('should switch between active and archive tabs', async ({ page }) => {
    await orRole(page, 'tab', 'Архив', 'Archive').click();
    await expect(orRole(page, 'tab', 'Архив', 'Archive')).toHaveAttribute('aria-selected', 'true');
    await orRole(page, 'tab', 'Активные', 'Active').click();
    await expect(orRole(page, 'tab', 'Активные', 'Active')).toHaveAttribute('aria-selected', 'true');
  });

  test('should open vault on click', async ({ page }) => {
    const vaultName = `Test Vault ${Date.now()}`;
    await createVault(page, vaultName);
    await openVault(page, vaultName);
    await expect(orRole(page, 'tab', 'Редактор', 'Editor')).toBeVisible({ timeout: 15000 });
  });

  test('should show create vault form', async ({ page }) => {
    await expect(orRole(page, 'button', 'Создать', 'Create')).toBeVisible();
    await orRole(page, 'button', 'Создать', 'Create').click();
    await expect(orLocator(
      page.locator('input[name="vault-name"]'),
      page.locator('input[placeholder*="название" i]'),
      page.locator('input[placeholder*="name" i]')
    )).toBeVisible();
  });
});