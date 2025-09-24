const { chromium } = require('playwright');

async function debugAuthState() {
  console.log('🔍 Debugging Authentication State...\n');
  
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
    
    // Check authentication state
    const authState = await page.evaluate(() => {
      return {
        token: localStorage.getItem('token'),
        isAuthenticated: !window.location.href.includes('/login'),
        currentUrl: window.location.href
      };
    });
    
    console.log('🔍 Authentication State:');
    console.log('  Token present:', !!authState.token);
    console.log('  Is authenticated:', authState.isAuthenticated);
    console.log('  Current URL:', authState.currentUrl);
    
    // Check if there are any JavaScript errors
    console.log('\n📝 JavaScript Errors:');
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`  ERROR: ${msg.text()}`);
      }
    });
    
    // Wait a bit to see if authentication state changes
    await page.waitForTimeout(3000);
    
    // Check authentication state again
    const authState2 = await page.evaluate(() => {
      return {
        token: localStorage.getItem('token'),
        isAuthenticated: !window.location.href.includes('/login'),
        currentUrl: window.location.href
      };
    });
    
    console.log('\n🔍 Authentication State (after 3s):');
    console.log('  Token present:', !!authState2.token);
    console.log('  Is authenticated:', authState2.isAuthenticated);
    console.log('  Current URL:', authState2.currentUrl);
    
    // Try to access admin panel
    console.log('\n📊 Trying to access admin panel...');
    await page.goto('https://family-finance-frontend.onrender.com/admin');
    await page.waitForLoadState('networkidle');
    
    const adminUrl = page.url();
    console.log(`📍 Admin URL: ${adminUrl}`);
    
    if (adminUrl.includes('/login')) {
      console.log('❌ Redirected back to login - role check failed');
      
      // Check what the role check is seeing
      const roleCheck = await page.evaluate(() => {
        // Try to access the user role from the app state
        const appElement = document.querySelector('#root');
        if (appElement && appElement._reactInternalFiber) {
          // This is a hack to try to access React state
          return 'React state not accessible';
        }
        return 'No React state found';
      });
      
      console.log('Role check result:', roleCheck);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await browser.close();
  }
}

debugAuthState();
