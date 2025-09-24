const { chromium } = require('playwright');

async function debugAuthStateAfterLogin() {
  console.log('🔍 Debugging Authentication State After Login...\n');
  
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
    // Go to login page
    console.log('🔐 Going to login page...');
    await page.goto('https://family-finance-frontend.onrender.com/login');
    await page.waitForSelector('input[type="email"]');
    
    // Fill in credentials
    console.log('📝 Filling in credentials...');
    await page.fill('input[type="email"]', 'omarosullivan@gmail.com');
    await page.fill('input[type="password"]', 'admin123');
    
    // Click submit
    console.log('🚀 Submitting login form...');
    await page.click('button[type="submit"]');
    
    // Wait for redirect
    await page.waitForTimeout(3000);
    
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
    
    // Check if there are any error messages
    const errorElement = await page.locator('.error').count();
    console.log(`❌ Error elements found: ${errorElement}`);
    
    // Check if there's a loading indicator
    const loadingElement = await page.locator('.loading').count();
    console.log(`⏳ Loading elements found: ${loadingElement}`);
    
    if (loadingElement > 0) {
      const loadingText = await page.locator('.loading').textContent();
      console.log(`⏳ Loading text: ${loadingText}`);
    }
    
    // Wait a bit more to see if authentication completes
    console.log('⏳ Waiting for authentication to complete...');
    await page.waitForTimeout(10000);
    
    // Check final state
    const finalAuthState = await page.evaluate(() => {
      return {
        isAuthenticated: window.isAuthenticated,
        userRole: window.userRole,
        currentUser: window.currentUser,
        roleLoading: window.roleLoading,
        loading: window.loading
      };
    });
    console.log(`🔐 Final Auth State:`, finalAuthState);
    
    // Check final URL
    const finalUrl = page.url();
    console.log(`📍 Final URL: ${finalUrl}`);
    
    // Try to access GL Transactions
    console.log('📚 Trying to access GL Transactions...');
    await page.goto('https://family-finance-frontend.onrender.com/gl-transactions');
    await page.waitForTimeout(5000);
    
    const glUrl = page.url();
    console.log(`📍 GL Transactions URL: ${glUrl}`);
    
    if (glUrl.includes('/login')) {
      console.log('❌ Redirected back to login when accessing GL Transactions');
    } else {
      console.log('✅ GL Transactions page accessible');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

debugAuthStateAfterLogin();
