const { chromium } = require('playwright');

async function testSimpleLogin() {
  console.log('🔍 Testing Simple Login...\n');
  
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
    
    // Check the page title
    const title = await page.title();
    console.log(`📄 Page title: ${title}`);
    
    // Check if login form is present
    const formPresent = await page.locator('form').count();
    console.log(`📝 Login form present: ${formPresent > 0}`);
    
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
      console.log('❌ Still on login page - login failed');
    } else {
      console.log('✅ Login successful - redirected to dashboard');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

testSimpleLogin();
