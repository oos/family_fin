const { chromium } = require('playwright');

async function testGLTransactions() {
  console.log('🔍 Testing GL Transactions Page...\n');
  
  const browser = await chromium.launch({ 
    headless: false, 
    slowMo: 1000,
    devtools: true
  });
  
  const page = await browser.newPage();
  
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
    
    // Now try to access GL Transactions page
    console.log('📊 Navigating to GL Transactions page...');
    await page.goto('https://family-finance-frontend.onrender.com/gl-transactions');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    const glUrl = page.url();
    console.log(`📍 GL Transactions URL: ${glUrl}`);
    
    if (glUrl.includes('/login')) {
      console.log('❌ Redirected back to login - authentication failed');
      return false;
    }
    
    // Check for GL Transactions elements
    const glHeading = await page.locator('h1:has-text("GL Transactions")').count();
    console.log(`GL Transactions heading found: ${glHeading > 0}`);
    
    const loadingIndicators = await page.locator('.spinner-border').count();
    console.log(`Loading indicators found: ${loadingIndicators}`);
    
    const dataTables = await page.locator('table').count();
    console.log(`Data tables found: ${dataTables}`);
    
    // Wait for data to load
    console.log('⏳ Waiting for data to load...');
    await page.waitForTimeout(10000);
    
    // Check final state
    const finalLoadingIndicators = await page.locator('.spinner-border').count();
    const finalDataTables = await page.locator('table').count();
    
    console.log(`\n📊 Final State:`);
    console.log(`  Loading indicators: ${finalLoadingIndicators}`);
    console.log(`  Data tables: ${finalDataTables}`);
    
    if (finalDataTables > 0) {
      console.log('✅ GL Transactions page loaded successfully');
      return true;
    } else {
      console.log('❌ GL Transactions page failed to load data');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  } finally {
    await browser.close();
  }
}

testGLTransactions();
