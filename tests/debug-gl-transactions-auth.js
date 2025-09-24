const { chromium } = require('playwright');

async function debugGLTransactionsAuth() {
  console.log('🔍 Debugging GL Transactions Authentication...\n');
  
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
    
    // Try to access GL Transactions page
    console.log('📊 Trying to access GL Transactions page...');
    
    // First, try to navigate to the dashboard to ensure we're authenticated
    await page.goto('https://family-finance-frontend.onrender.com/');
    await page.waitForLoadState('networkidle');
    
    const dashboardUrl = page.url();
    console.log(`📍 Dashboard URL: ${dashboardUrl}`);
    
    // Now try GL Transactions
    console.log('📚 Navigating to GL Transactions...');
    await page.goto('https://family-finance-frontend.onrender.com/gl-transactions');
    
    // Wait for any redirects or errors
    await page.waitForTimeout(5000);
    
    const glUrl = page.url();
    console.log(`📍 GL Transactions URL: ${glUrl}`);
    
    if (glUrl.includes('/login')) {
      console.log('❌ Redirected back to login');
    } else if (glUrl.includes('/user-dashboard')) {
      console.log('❌ Redirected to user dashboard (insufficient permissions)');
    } else if (glUrl.includes('/gl-transactions')) {
      console.log('✅ GL Transactions page loaded successfully');
      
      // Check for any error messages
      const errorElements = await page.locator('.error').count();
      console.log(`❌ Error elements: ${errorElements}`);
      
      // Check for loading indicators
      const loadingElements = await page.locator('.loading').count();
      console.log(`⏳ Loading elements: ${loadingElements}`);
      
      // Check page title
      const title = await page.title();
      console.log(`📄 Page title: ${title}`);
      
    } else {
      console.log(`❓ Unexpected redirect to: ${glUrl}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

debugGLTransactionsAuth();
