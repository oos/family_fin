const { chromium } = require('playwright');

async function debugAPIResponse() {
  console.log('🔍 Debugging API Response...\n');
  
  const browser = await chromium.launch({ 
    headless: false, 
    slowMo: 1000,
    devtools: true
  });
  
  const page = await browser.newPage();
  
  try {
    // Navigate to login
    console.log('🔐 Navigating to login...');
    await page.goto('https://family-finance-frontend.onrender.com/login');
    
    // Wait for login form
    await page.waitForSelector('input[type="email"]');
    
    // Fill credentials
    await page.fill('input[type="email"]', 'omarosullivan@gmail.com');
    await page.fill('input[type="password"]', 'admin123');
    
    // Monitor the login API call
    let loginResponse = null;
    page.on('response', async response => {
      if (response.url().includes('/api/auth/login')) {
        console.log(`📡 Login API Response: ${response.status()}`);
        try {
          const responseData = await response.json();
          console.log('Response data:', JSON.stringify(responseData, null, 2));
          loginResponse = responseData;
        } catch (e) {
          console.log('Failed to parse response JSON:', e.message);
        }
      }
    });
    
    // Click login
    console.log('🔑 Clicking login button...');
    await page.click('button[type="submit"]');
    
    // Wait for the API call to complete
    await page.waitForTimeout(5000);
    
    console.log('\n📊 Login Response Analysis:');
    if (loginResponse) {
      console.log('✅ Login API call succeeded');
      console.log('Access token present:', !!loginResponse.access_token);
      console.log('User data present:', !!loginResponse.user);
      if (loginResponse.user) {
        console.log('User role:', loginResponse.user.role);
      }
    } else {
      console.log('❌ Login API call failed or no response received');
    }
    
    // Check if there are any JavaScript errors
    console.log('\n📝 JavaScript Errors:');
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`  ERROR: ${msg.text()}`);
      }
    });
    
    // Wait a bit more to catch any errors
    await page.waitForTimeout(3000);
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await browser.close();
  }
}

debugAPIResponse();
