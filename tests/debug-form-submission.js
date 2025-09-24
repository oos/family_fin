const { chromium } = require('playwright');

async function debugFormSubmission() {
  console.log('🔍 Debugging Form Submission...\n');
  
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
    console.log('✅ Login form loaded');
    
    // Check form elements
    const emailInput = await page.locator('input[type="email"]');
    const passwordInput = await page.locator('input[type="password"]');
    const submitButton = await page.locator('button[type="submit"]');
    
    console.log('Form elements found:');
    console.log('  Email input:', await emailInput.count());
    console.log('  Password input:', await passwordInput.count());
    console.log('  Submit button:', await submitButton.count());
    
    // Fill credentials
    await emailInput.fill('omarosullivan@gmail.com');
    await passwordInput.fill('admin123');
    console.log('✅ Credentials filled');
    
    // Check if form is valid
    const isFormValid = await page.evaluate(() => {
      const form = document.querySelector('form');
      return form ? form.checkValidity() : false;
    });
    console.log('Form is valid:', isFormValid);
    
    // Monitor all network requests
    page.on('request', request => {
      console.log(`🌐 REQ: ${request.method()} ${request.url()}`);
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        console.log(`📡 RES: ${response.status()} ${response.url()}`);
      }
    });
    
    // Click login
    console.log('🔑 Clicking login button...');
    await submitButton.click();
    
    // Wait for any network activity
    await page.waitForTimeout(3000);
    
    // Check current URL
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);
    
    // Check for any error messages
    const errorElements = await page.locator('.alert-danger, .error, [class*="error"]').count();
    console.log(`Error elements found: ${errorElements}`);
    
    if (errorElements > 0) {
      const errorText = await page.locator('.alert-danger, .error, [class*="error"]').first().textContent();
      console.log(`Error message: ${errorText}`);
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

debugFormSubmission();
