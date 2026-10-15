const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', error => {
    errors.push(error.message);
  });
  
  try {
    await page.goto('http://localhost:18081', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('Page loaded successfully');
    
    // Wait a bit for any async errors
    await page.waitForTimeout(2000);
    
    if (errors.length > 0) {
      console.log('Console errors:');
      errors.forEach(e => console.log('  ERROR:', e));
    } else {
      console.log('No console errors');
    }
    
    // Check if root has content
    const rootContent = await page.evaluate(() => document.getElementById('root').innerHTML);
    console.log('Root content length:', rootContent.length);
    console.log('Root content preview:', rootContent.substring(0, 200));
    
    // Check if loading state is visible
    const loadingElement = await page.$('main[aria-busy="true"]');
    console.log('Loading element present:', !!loadingElement);
    
    // Check if auth page is visible
    const authPage = await page.$('section.auth-panel');
    console.log('Auth page present:', !!authPage);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  await browser.close();
})();