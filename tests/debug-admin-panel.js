const { chromium } = require('playwright');

async function debugAdminPanel() {
  console.log('🔍 Debugging AdminPanel...\n');
  
  const browser = await chromium.launch({ 
    headless: false, 
    slowMo: 1000,
    devtools: true // Open DevTools
  });
  
  const page = await browser.newPage();
  
  try {
    // Login
    console.log('🔐 Logging in...');
    await page.goto('https://family-finance-frontend.onrender.com/login');
    await page.waitForSelector('input[type="email"]');
    await page.fill('input[type="email"]', 'omarosullivan@gmail.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    console.log('✅ Login completed');
    
    // Go to AdminPanel
    console.log('📊 Navigating to AdminPanel...');
    await page.goto('https://family-finance-frontend.onrender.com/admin?tab=loans');
    
    // Wait a bit for the page to load
    await page.waitForTimeout(3000);
    
    // Check what's on the page
    console.log('\n📋 Page Analysis:');
    
    // Check page title
    const title = await page.title();
    console.log(`Title: ${title}`);
    
    // Check URL
    const url = page.url();
    console.log(`URL: ${url}`);
    
    // Check for AdminPanel elements
    const adminPanelExists = await page.locator('h1:has-text("Admin Panel")').count();
    console.log(`Admin Panel heading found: ${adminPanelExists > 0}`);
    
    // Check for loading indicators
    const loadingExists = await page.locator('.spinner-border').count();
    console.log(`Loading indicators found: ${loadingExists}`);
    
    // Check for error messages
    const errorExists = await page.locator('.alert-danger, .error').count();
    console.log(`Error messages found: ${errorExists}`);
    
    // Check for data tables
    const tableExists = await page.locator('table').count();
    console.log(`Data tables found: ${tableExists}`);
    
    // Check for console logs
    console.log('\n📝 Console Logs:');
    page.on('console', msg => {
      console.log(`  [${msg.type()}] ${msg.text()}`);
    });
    
    // Check for network requests
    console.log('\n🌐 Network Requests:');
    page.on('request', request => {
      console.log(`  REQ: ${request.method()} ${request.url()}`);
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        console.log(`  RES: ${response.status()} ${response.url()}`);
      }
    });
    
    // Take a screenshot
    await page.screenshot({ path: 'admin-panel-debug.png' });
    console.log('\n📸 Screenshot saved as admin-panel-debug.png');
    
    // Wait longer to see what happens
    console.log('\n⏳ Waiting 10 seconds to observe behavior...');
    await page.waitForTimeout(10000);
    
    // Check final state
    console.log('\n📊 Final State:');
    const finalLoadingExists = await page.locator('.spinner-border').count();
    console.log(`Loading indicators still present: ${finalLoadingExists}`);
    
    const finalTableExists = await page.locator('table').count();
    console.log(`Data tables now present: ${finalTableExists}`);
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await browser.close();
  }
}

debugAdminPanel();
