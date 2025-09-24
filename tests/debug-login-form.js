const { chromium } = require('playwright');

async function debugLoginForm() {
  console.log('🔍 Debugging Login Form...\n');
  
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
  
  // Listen to page errors
  page.on('pageerror', error => {
    console.error('❌ Page error:', error.message);
  });
  
  try {
    // Go to login page
    console.log('🔐 Going to login page...');
    await page.goto('https://family-finance-frontend.onrender.com/login');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Check if the login form is present
    const formPresent = await page.locator('form').count();
    console.log(`📝 Login form present: ${formPresent > 0}`);
    
    // Check if the email input is present
    const emailInputPresent = await page.locator('input[type="email"]').count();
    console.log(`📝 Email input present: ${emailInputPresent > 0}`);
    
    // Check if the password input is present
    const passwordInputPresent = await page.locator('input[type="password"]').count();
    console.log(`📝 Password input present: ${passwordInputPresent > 0}`);
    
    // Check if the submit button is present
    const submitButtonPresent = await page.locator('button[type="submit"]').count();
    console.log(`📝 Submit button present: ${submitButtonPresent > 0}`);
    
    // Check page title
    const title = await page.title();
    console.log(`📄 Page title: ${title}`);
    
    // Check if there are any error messages
    const errorElements = await page.locator('.error').count();
    console.log(`❌ Error elements: ${errorElements}`);
    
    if (errorElements > 0) {
      const errorText = await page.locator('.error').textContent();
      console.log(`❌ Error message: ${errorText}`);
    }
    
    // Try to fill in the form
    console.log('📝 Filling in credentials...');
    await page.fill('input[type="email"]', 'omarosullivan@gmail.com');
    await page.fill('input[type="password"]', 'admin123');
    
    // Check if the form values are set
    const emailValue = await page.inputValue('input[type="email"]');
    const passwordValue = await page.inputValue('input[type="password"]');
    console.log(`📝 Email value: ${emailValue}`);
    console.log(`📝 Password value: ${passwordValue ? 'Set' : 'Not set'}`);
    
    // Try to click the submit button
    console.log('🚀 Clicking submit button...');
    await page.click('button[type="submit"]');
    
    // Wait for any network activity
    await page.waitForTimeout(5000);
    
    // Check current URL
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);
    
    // Check localStorage
    const token = await page.evaluate(() => localStorage.getItem('token'));
    console.log(`🔑 Token in localStorage: ${token ? 'Present' : 'Missing'}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

debugLoginForm();
