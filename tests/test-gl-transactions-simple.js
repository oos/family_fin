const { chromium } = require('playwright');

async function testGLTransactionsSimple() {
  console.log('🔍 Testing GL Transactions Page (Simple)...\n');
  
  const browser = await chromium.launch({ 
    headless: false, 
    slowMo: 1000,
    devtools: true
  });
  
  const page = await browser.newPage();
  
  // Listen to console logs
  page.on('console', msg => {
    console.log(`📝 Console ${msg.type()}: ${msg.text()}`);
  });
  
  try {
    // Login first
    console.log('🔐 Logging in...');
    await page.goto('https://family-finance-frontend.onrender.com/login');
    await page.waitForSelector('input[type="email"]');
    await page.fill('input[type="email"]', 'omarosullivan@gmail.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Wait for login to complete
    await page.waitForLoadState('networkidle');
    console.log('✅ Login completed');
    
    // Check current URL
    const currentUrl = page.url();
    console.log(`📍 Current URL after login: ${currentUrl}`);
    
    // Now try to access GL Transactions page directly
    console.log('📊 Navigating to GL Transactions page...');
    try {
      await page.goto('https://family-finance-frontend.onrender.com/gl-transactions', { 
        waitUntil: 'domcontentloaded',
        timeout: 10000 
      });
      
      const glUrl = page.url();
      console.log(`📍 GL Transactions URL: ${glUrl}`);
      
      if (glUrl.includes('/login')) {
        console.log('❌ Redirected back to login');
        return false;
      }
      
      // Check if the page loaded
      const title = await page.title();
      console.log(`📄 Page title: ${title}`);
      
      // Check for any error messages
      const errorElements = await page.locator('.error').count();
      console.log(`❌ Error elements: ${errorElements}`);
      
      // Check for loading indicators
      const loadingElements = await page.locator('.loading').count();
      console.log(`⏳ Loading elements: ${loadingElements}`);
      
      // Wait a bit for any JavaScript to load
      await page.waitForTimeout(5000);
      
      // Check final state
      const finalUrl = page.url();
      console.log(`📍 Final URL: ${finalUrl}`);
      
      if (finalUrl.includes('/gl-transactions')) {
        console.log('✅ GL Transactions page loaded successfully');
        return true;
      } else {
        console.log('❌ GL Transactions page failed to load');
        return false;
      }
      
    } catch (error) {
      console.error('❌ Error accessing GL Transactions page:', error.message);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  } finally {
    await browser.close();
  }
}

testGLTransactionsSimple();
