const { chromium } = require('playwright');

async function testAdminAccess() {
  console.log('🔍 Testing Admin Panel Access...\n');
  
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
    
    // Now try to access admin panel
    console.log('📊 Navigating to admin panel...');
    await page.goto('https://family-finance-frontend.onrender.com/admin');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);
    
    if (currentUrl.includes('/login')) {
      console.log('❌ Redirected back to login - role check failed');
      return false;
    }
    
    // Check for admin panel elements
    const adminHeading = await page.locator('h1:has-text("Admin Panel")').count();
    console.log(`Admin Panel heading found: ${adminHeading > 0}`);
    
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
      console.log('✅ Admin panel loaded successfully');
      return true;
    } else {
      console.log('❌ Admin panel failed to load data');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  } finally {
    await browser.close();
  }
}

testAdminAccess();
