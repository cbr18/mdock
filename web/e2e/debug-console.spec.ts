import { test, expect } from '@playwright/test';
import { login, createVault, openVault, createFile, switchViewMode, BASE_URL } from './helpers';

test('debug view modes with console', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.log('CONSOLE ERROR:', msg.text());
    }
  });
  page.on('pageerror', error => {
    consoleErrors.push(error.message);
    console.log('PAGE ERROR:', error.message);
  });
  
  await login(page);
  const vaultName = `Test Vault ${Date.now()}`;
  await createVault(page, vaultName);
  await openVault(page, vaultName);
  
  const createRootBtn = page.getByRole('button', { name: 'Создать рабочую папку' });
  if (await createRootBtn.isVisible({ timeout: 2000 })) {
    await createRootBtn.click();
    await expect(page.getByRole('button', { name: 'Создать файл' })).not.toBeDisabled({ timeout: 5000 });
  }
  
  const fileName = `note-${Date.now()}.md`;
  await createFile(page, fileName);
  await page.getByRole('link', { name: fileName }).click();
  
  await page.waitForTimeout(3000);
  
  console.log('--- Clicking rendered ---');
  await switchViewMode(page, 'rendered');
  await page.waitForTimeout(2000);
  
  console.log('--- Clicking plain ---');
  await switchViewMode(page, 'plain');
  await page.waitForTimeout(5000);
  
  console.log('Console errors:', consoleErrors);
  
  const html = await page.locator('body').innerHTML();
  console.log('Final HTML:', html);
});