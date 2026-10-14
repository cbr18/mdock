import { test, expect } from '@playwright/test';
import { login, createVault, openVault, createFile, switchViewMode, BASE_URL } from './helpers';

test('debug view modes step by step', async ({ page }) => {
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
  
  // Wait for page to load
  await page.waitForTimeout(3000);
  
  // Check initial tabs
  let tabs = await page.locator('[role="tab"]').allTextContents();
  console.log('Initial tabs:', tabs);
  
  // Check initial view mode elements
  let viewElements = await page.locator('.rendered-preview-view, .markdown-editor-shell, .split-document-view, .live-document-view').count();
  console.log('Initial view elements:', viewElements);
  
  // Click rendered tab
  console.log('Clicking rendered tab...');
  await switchViewMode(page, 'rendered');
  await page.waitForTimeout(2000);
  
  tabs = await page.locator('[role="tab"]').allTextContents();
  console.log('Tabs after rendered:', tabs);
  
  viewElements = await page.locator('.rendered-preview-view, .markdown-editor-shell, .split-document-view, .live-document-view').count();
  console.log('View elements after rendered:', viewElements);
  
  const renderedHtml = await page.locator('body').innerHTML();
  console.log('Has rendered-preview-view:', renderedHtml.includes('rendered-preview-view'));
  
  // Click plain tab
  console.log('Clicking plain tab...');
  await switchViewMode(page, 'plain');
  await page.waitForTimeout(3000);
  
  tabs = await page.locator('[role="tab"]').allTextContents();
  console.log('Tabs after plain:', tabs);
  
  viewElements = await page.locator('.rendered-preview-view, .markdown-editor-shell, .split-document-view, .live-document-view').count();
  console.log('View elements after plain:', viewElements);
  
  const plainHtml = await page.locator('body').innerHTML();
  console.log('Has markdown-editor-shell:', plainHtml.includes('markdown-editor-shell'));
  console.log('Has cm-editor:', plainHtml.includes('cm-editor'));
  console.log('Body length:', plainHtml.length);
  console.log('Body excerpt:', plainHtml.substring(0, 2000));
  
  // Check if root has children
  const rootHtml = await page.locator('#root').innerHTML();
  console.log('Root HTML length:', rootHtml.length);
  console.log('Root HTML:', rootHtml.substring(0, 1000));
});