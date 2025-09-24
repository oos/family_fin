const { chromium } = require('playwright');

async function debugLoginDetailed() {
  console.log('🔍 Debugging Login Process...\n');
  
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
      console.log(`🌐 Headers:`, request.headers());
    }
  });
  
  // Listen to network responses
  page.on('response', response => {
    if (response.url().includes('/api/auth/login')) {
      console.log(`🌐 Login Response: ${response.status()} ${response.url()}`);
      console.log(`🌐 Response Headers:`, response.headers());
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
    
    // Click submit and wait for response
    console.log('🚀 Submitting login form...');
    await page.click('button[type="submit"]');
    
    // Wait for any network activity
    await page.waitForTimeout(5000);
    
    // Check current URL
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);
    
    // Check localStorage
    const token = await page.evaluate(() => localStorage.getItem('token'));
    console.log(`🔑 Token in localStorage: ${token ? 'Present' : 'Missing'}`);
    
    // Check if there are any error messages
    const errorElement = await page.locator('.error').count();
    console.log(`❌ Error elements found: ${errorElement}`);
    
    if (errorElement > 0) {
      const errorText = await page.locator('.error').textContent();
      console.log(`❌ Error message: ${errorText}`);
    }
    
    // Check if there's a loading indicator
    const loadingElement = await page.locator('.loading').count();
    console.log(`⏳ Loading elements found: ${loadingElement}`);
    
    // Check the page title
    const title = await page.title();
    console.log(`📄 Page title: ${title}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

debugLoginDetailed();
