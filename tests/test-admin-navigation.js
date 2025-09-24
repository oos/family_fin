const { chromium } = require('playwright');

async function testAdminNavigation() {
  console.log('🔍 Testing Admin Panel Navigation...\n');
  
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
    
    // Try to navigate to admin panel using the sidebar or direct navigation
    console.log('📊 Trying to navigate to admin panel...');
    
    // First, try to find the admin panel link in the sidebar
    const adminLink = await page.locator('a[href="/admin"]').count();
    console.log(`Admin panel link found: ${adminLink}`);
    
    if (adminLink > 0) {
      console.log('🔗 Clicking admin panel link...');
      await page.click('a[href="/admin"]');
      await page.waitForLoadState('networkidle');
    } else {
      console.log('🔗 Admin panel link not found, trying direct navigation...');
      await page.goto('https://family-finance-frontend.onrender.com/admin');
      await page.waitForLoadState('networkidle');
    }
    
    const adminUrl = page.url();
    console.log(`📍 Admin URL: ${adminUrl}`);
    
    if (adminUrl.includes('/login')) {
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

testAdminNavigation();
