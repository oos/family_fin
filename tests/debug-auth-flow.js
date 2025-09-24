const { chromium } = require('playwright');

async function debugAuthFlow() {
  console.log('🔍 Debugging Authentication Flow...\n');
  
  const browser = await chromium.launch({ 
    headless: false, 
    slowMo: 1000,
    devtools: true
  });
  
  const page = await browser.newPage();
  
  try {
    // Monitor all network requests
    page.on('request', request => {
      console.log(`🌐 REQ: ${request.method()} ${request.url()}`);
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        console.log(`📡 RES: ${response.status()} ${response.url()}`);
      }
    });
    
    // Monitor console logs
    page.on('console', msg => {
      console.log(`📝 [${msg.type()}] ${msg.text()}`);
    });
    
    // Navigate to login
    console.log('🔐 Navigating to login...');
    await page.goto('https://family-finance-frontend.onrender.com/login');
    
    // Wait for login form
    await page.waitForSelector('input[type="email"]');
    console.log('✅ Login form loaded');
    
    // Fill credentials
    await page.fill('input[type="email"]', 'omarosullivan@gmail.com');
    await page.fill('input[type="password"]', 'admin123');
    console.log('✅ Credentials filled');
    
    // Click login
    await page.click('button[type="submit"]');
    console.log('✅ Login button clicked');
    
    // Wait for navigation
    await page.waitForLoadState('networkidle');
    console.log('✅ Page loaded');
    
    // Check current URL
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);
    
    // Check if we're redirected to login
    if (currentUrl.includes('/login')) {
      console.log('❌ Still on login page - authentication failed');
      
      // Check for error messages
      const errorElements = await page.locator('.alert-danger, .error, [class*="error"]').count();
      console.log(`Error elements found: ${errorElements}`);
      
      if (errorElements > 0) {
        const errorText = await page.locator('.alert-danger, .error, [class*="error"]').first().textContent();
        console.log(`Error message: ${errorText}`);
      }
    } else {
      console.log('✅ Successfully navigated away from login');
      
      // Try to navigate to admin panel
      console.log('📊 Navigating to admin panel...');
      await page.goto('https://family-finance-frontend.onrender.com/admin?tab=loans');
      
      // Wait a bit
      await page.waitForTimeout(3000);
      
      const adminUrl = page.url();
      console.log(`📍 Admin URL: ${adminUrl}`);
      
      if (adminUrl.includes('/login')) {
        console.log('❌ Redirected back to login - role check failed');
      } else if (adminUrl.includes('/admin')) {
        console.log('✅ Successfully accessed admin panel');
        
        // Check for admin panel elements
        const adminHeading = await page.locator('h1:has-text("Admin Panel")').count();
        console.log(`Admin Panel heading found: ${adminHeading > 0}`);
        
        const loadingIndicators = await page.locator('.spinner-border').count();
        console.log(`Loading indicators found: ${loadingIndicators}`);
        
        const dataTables = await page.locator('table').count();
        console.log(`Data tables found: ${dataTables}`);
      }
    }
    
    // Take screenshot
    await page.screenshot({ path: 'auth-flow-debug.png' });
    console.log('📸 Screenshot saved as auth-flow-debug.png');
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await browser.close();
  }
}

debugAuthFlow();
