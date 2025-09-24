const { chromium } = require('playwright');

async function testAuthFlow() {
  console.log('🔍 Testing Authentication Flow...\n');
  
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
    
    // Check localStorage for token
    const token = await page.evaluate(() => localStorage.getItem('token'));
    console.log(`🔑 Token in localStorage: ${token ? 'Present' : 'Missing'}`);
    
    if (token) {
      console.log(`🔑 Token length: ${token.length}`);
      console.log(`🔑 Token preview: ${token.substring(0, 20)}...`);
    }
    
    // Check if we're authenticated
    const isAuthenticated = await page.evaluate(() => {
      return window.isAuthenticated || false;
    });
    console.log(`🔐 isAuthenticated state: ${isAuthenticated}`);
    
    // Try to access dashboard
    console.log('📊 Navigating to dashboard...');
    await page.goto('https://family-finance-frontend.onrender.com/');
    await page.waitForLoadState('networkidle');
    
    const dashboardUrl = page.url();
    console.log(`📍 Dashboard URL: ${dashboardUrl}`);
    
    if (dashboardUrl.includes('/login')) {
      console.log('❌ Redirected back to login - authentication failed');
      return false;
    }
    
    console.log('✅ Dashboard loaded successfully');
    
    // Now try GL Transactions
    console.log('📚 Trying GL Transactions...');
    await page.goto('https://family-finance-frontend.onrender.com/gl-transactions');
    
    // Wait a bit for any redirects
    await page.waitForTimeout(3000);
    
    const glUrl = page.url();
    console.log(`📍 GL Transactions URL: ${glUrl}`);
    
    if (glUrl.includes('/login')) {
      console.log('❌ Redirected back to login when accessing GL Transactions');
      return false;
    }
    
    console.log('✅ GL Transactions page accessible');
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  } finally {
    await browser.close();
  }
}

testAuthFlow();
