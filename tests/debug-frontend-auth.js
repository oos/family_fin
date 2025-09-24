const { chromium } = require('playwright');

async function debugFrontendAuth() {
  console.log('🔍 Debugging Frontend Authentication...\n');
  
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
    
    // Check for error messages
    const errorElements = await page.locator('.alert-danger, .error, [class*="error"]').count();
    console.log(`Error elements found: ${errorElements}`);
    
    if (errorElements > 0) {
      const errorText = await page.locator('.alert-danger, .error, [class*="error"]').first().textContent();
      console.log(`Error message: ${errorText}`);
    }
    
    // Check localStorage for token
    const token = await page.evaluate(() => localStorage.getItem('token'));
    console.log(`Token in localStorage: ${token ? 'Present' : 'Not present'}`);
    
    // Check if user is authenticated
    const isAuthenticated = await page.evaluate(() => {
      return window.location.href.includes('/login') ? false : true;
    });
    console.log(`Is authenticated: ${isAuthenticated}`);
    
    // Take screenshot
    await page.screenshot({ path: 'frontend-auth-debug.png' });
    console.log('📸 Screenshot saved as frontend-auth-debug.png');
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await browser.close();
  }
}

debugFrontendAuth();
