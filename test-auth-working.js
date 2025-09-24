const { chromium } = require('playwright');

async function testAuthWorking() {
  console.log('🔍 Testing Authentication on Working Commit...\n');
  
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
    
    // Fill in credentials
    console.log('📝 Filling in credentials...');
    await page.fill('input[type="email"]', 'omarosullivan@gmail.com');
    await page.fill('input[type="password"]', 'admin123');
    
    // Click submit
    console.log('🚀 Submitting login form...');
    await page.click('button[type="submit"]');
    
    // Wait for response
    await page.waitForTimeout(5000);
    
    // Check current URL
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);
    
    // Check localStorage
    const token = await page.evaluate(() => localStorage.getItem('token'));
    console.log(`🔑 Token in localStorage: ${token ? 'Present' : 'Missing'}`);
    
    if (currentUrl.includes('/login')) {
      console.log('❌ Still on login page - authentication failed');
    } else {
      console.log('✅ Authentication successful - redirected to dashboard');
      
      // Test accessing other pages
      console.log('📚 Testing page access...');
      const pagesToTest = ['/admin', '/income', '/properties', '/loans'];
      
      for (const pagePath of pagesToTest) {
        try {
          await page.goto(`https://family-finance-frontend.onrender.com${pagePath}`);
          await page.waitForTimeout(2000);
          
          const pageUrl = page.url();
          if (pageUrl.includes('/login')) {
            console.log(`  ❌ ${pagePath} - redirected to login`);
          } else {
            console.log(`  ✅ ${pagePath} - accessible`);
          }
        } catch (error) {
          console.log(`  ❌ ${pagePath} - error: ${error.message}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

testAuthWorking();
