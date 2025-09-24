const { chromium } = require('playwright');

async function debugLoginConsole() {
  console.log('🔍 Debugging Login Console Output...\n');
  
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
  
  // Listen to network requests
  page.on('request', request => {
    if (request.url().includes('/api/auth/login')) {
      console.log(`🌐 Login Request: ${request.method()} ${request.url()}`);
    }
  });
  
  // Listen to network responses
  page.on('response', response => {
    if (response.url().includes('/api/auth/login')) {
      console.log(`🌐 Login Response: ${response.status()} ${response.url()}`);
    }
  });
  
  try {
    // Go to login page
    console.log('🔐 Going to login page...');
    await page.goto('https://family-finance-frontend.onrender.com/login');
    await page.waitForSelector('input[type="email"]');
    
    // Fill in credentials
    console.log('📝 Filling in credentials...');
    await page.fill('input[type="email"]', 'omarosullivan@gmail.com');
    await page.fill('input[type="password"]', 'admin123');
    
    // Click submit and wait for console logs
    console.log('🚀 Submitting login form...');
    await page.click('button[type="submit"]');
    
    // Wait for console logs to appear
    console.log('⏳ Waiting for console logs...');
    await page.waitForTimeout(10000);
    
    // Check current URL
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);
    
    // Check localStorage
    const token = await page.evaluate(() => localStorage.getItem('token'));
    console.log(`🔑 Token in localStorage: ${token ? 'Present' : 'Missing'}`);
    
    // Check authentication state
    const authState = await page.evaluate(() => {
      return {
        isAuthenticated: window.isAuthenticated,
        userRole: window.userRole,
        currentUser: window.currentUser,
        roleLoading: window.roleLoading,
        loading: window.loading
      };
    });
    console.log(`🔐 Auth State:`, authState);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

debugLoginConsole();
