const { chromium } = require('playwright');

async function debugAuthStateTiming() {
  console.log('🔍 Debugging Authentication State Timing...\n');
  
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
    await page.waitForLoadState('networkidle');
    
    // Fill in credentials and submit
    console.log('📝 Filling in credentials...');
    await page.fill('input[type="email"]', 'omarosullivan@gmail.com');
    await page.fill('input[type="password"]', 'admin123');
    
    // Click submit and wait for the authentication to complete
    console.log('🚀 Submitting login form...');
    await page.click('button[type="submit"]');
    
    // Wait for the authentication to complete
    console.log('⏳ Waiting for authentication to complete...');
    await page.waitForTimeout(3000);
    
    // Check authentication state immediately after login
    const authState1 = await page.evaluate(() => {
      return {
        isAuthenticated: window.isAuthenticated,
        userRole: window.userRole,
        currentUser: window.currentUser,
        roleLoading: window.roleLoading,
        loading: window.loading
      };
    });
    console.log(`🔐 Auth State (immediate):`, authState1);
    
    // Wait a bit more
    console.log('⏳ Waiting 5 more seconds...');
    await page.waitForTimeout(5000);
    
    // Check authentication state again
    const authState2 = await page.evaluate(() => {
      return {
        isAuthenticated: window.isAuthenticated,
        userRole: window.userRole,
        currentUser: window.currentUser,
        roleLoading: window.roleLoading,
        loading: window.loading
      };
    });
    console.log(`🔐 Auth State (after 5s):`, authState2);
    
    // Check current URL
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);
    
    // Check localStorage
    const token = await page.evaluate(() => localStorage.getItem('token'));
    console.log(`🔑 Token in localStorage: ${token ? 'Present' : 'Missing'}`);
    
    // Try to access GL Transactions
    console.log('📚 Trying to access GL Transactions...');
    await page.goto('https://family-finance-frontend.onrender.com/gl-transactions');
    await page.waitForTimeout(3000);
    
    const glUrl = page.url();
    console.log(`📍 GL Transactions URL: ${glUrl}`);
    
    if (glUrl.includes('/login')) {
      console.log('❌ Redirected back to login');
    } else if (glUrl.includes('/gl-transactions')) {
      console.log('✅ GL Transactions page loaded successfully');
    } else {
      console.log(`❓ Redirected to: ${glUrl}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

debugAuthStateTiming();
