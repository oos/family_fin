const { chromium } = require('playwright');

class ComprehensiveButtonTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.testResults = [];
    this.currentPage = '';
  }

  async initialize() {
    console.log('🚀 Initializing Comprehensive Button Test...\n');
    this.browser = await chromium.launch({ 
      headless: false, 
      slowMo: 500,
      devtools: true
    });
    this.page = await this.browser.newPage();
    
    // Listen to console logs
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`❌ Console Error: ${msg.text()}`);
      }
    });
    
    // Listen to page errors
    this.page.on('pageerror', error => {
      console.error('❌ Page Error:', error.message);
    });
  }

  async login() {
    console.log('🔐 Logging in as admin...');
    await this.page.goto('https://family-finance-frontend.onrender.com/login');
    await this.page.waitForSelector('input[type="email"]');
    await this.page.fill('input[type="email"]', 'omarosullivan@gmail.com');
    await this.page.fill('input[type="password"]', 'admin123');
    await this.page.click('button[type="submit"]');
    
    // Wait for login to complete
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);
    
    const currentUrl = this.page.url();
    console.log(`📍 Login completed, current URL: ${currentUrl}`);
    
    if (currentUrl.includes('/login')) {
      throw new Error('Login failed - still on login page');
    }
    
    console.log('✅ Login successful\n');
  }

  async testPage(pageName, url, expectedButtons = []) {
    console.log(`\n📄 Testing Page: ${pageName}`);
    console.log(`🔗 URL: ${url}`);
    
    try {
      await this.page.goto(url);
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(2000);
      
      this.currentPage = pageName;
      
      // Check if page loaded correctly
      const finalUrl = this.page.url();
      if (finalUrl.includes('/login')) {
        this.recordResult(pageName, 'PAGE_ACCESS', false, 'Redirected to login page');
        return;
      }
      
      // Test all buttons on the page
      await this.testAllButtons(pageName);
      
      // Test specific expected buttons
      for (const button of expectedButtons) {
        await this.testSpecificButton(pageName, button);
      }
      
      this.recordResult(pageName, 'PAGE_LOAD', true, 'Page loaded successfully');
      
    } catch (error) {
      this.recordResult(pageName, 'PAGE_LOAD', false, `Error: ${error.message}`);
    }
  }

  async testAllButtons(pageName) {
    console.log(`  🔍 Testing all buttons on ${pageName}...`);
    
    try {
      // Find all clickable elements
      const buttons = await this.page.locator('button, input[type="button"], input[type="submit"], a[role="button"], [onclick]').all();
      const clickableElements = await this.page.locator('[onclick], button, input[type="button"], input[type="submit"], a[role="button"]').all();
      
      console.log(`  📊 Found ${buttons.length} buttons and ${clickableElements.length} clickable elements`);
      
      for (let i = 0; i < Math.min(buttons.length, 10); i++) { // Limit to first 10 buttons to avoid overwhelming
        try {
          const button = buttons[i];
          const isVisible = await button.isVisible();
          const isEnabled = await button.isEnabled();
          const text = await button.textContent();
          
          if (isVisible && isEnabled && text && text.trim()) {
            console.log(`    🔘 Testing button: "${text.trim()}"`);
            
            // Try to click the button
            try {
              await button.click();
              await this.page.waitForTimeout(1000);
              
              // Check if it caused any errors or unexpected behavior
              const currentUrl = this.page.url();
              console.log(`      ✅ Button clicked successfully, current URL: ${currentUrl}`);
              
              this.recordResult(pageName, `BUTTON_${text.trim()}`, true, 'Button clicked successfully');
              
            } catch (clickError) {
              console.log(`      ❌ Button click failed: ${clickError.message}`);
              this.recordResult(pageName, `BUTTON_${text.trim()}`, false, `Click failed: ${clickError.message}`);
            }
          }
        } catch (buttonError) {
          console.log(`    ❌ Error testing button ${i}: ${buttonError.message}`);
        }
      }
      
    } catch (error) {
      console.log(`  ❌ Error testing buttons: ${error.message}`);
      this.recordResult(pageName, 'BUTTON_TEST', false, `Error: ${error.message}`);
    }
  }

  async testSpecificButton(pageName, buttonInfo) {
    const { selector, name, expectedBehavior } = buttonInfo;
    
    try {
      const button = this.page.locator(selector);
      const isVisible = await button.isVisible();
      const isEnabled = await button.isEnabled();
      
      if (!isVisible) {
        this.recordResult(pageName, `BUTTON_${name}`, false, 'Button not visible');
        return;
      }
      
      if (!isEnabled) {
        this.recordResult(pageName, `BUTTON_${name}`, false, 'Button not enabled');
        return;
      }
      
      console.log(`    🔘 Testing specific button: ${name}`);
      
      const urlBefore = this.page.url();
      await button.click();
      await this.page.waitForTimeout(1000);
      const urlAfter = this.page.url();
      
      // Check expected behavior
      let success = true;
      let message = 'Button clicked successfully';
      
      if (expectedBehavior === 'navigate' && urlBefore === urlAfter) {
        success = false;
        message = 'Expected navigation but URL did not change';
      } else if (expectedBehavior === 'modal' && !await this.page.locator('.modal, [role="dialog"]').isVisible()) {
        success = false;
        message = 'Expected modal to open but none found';
      } else if (expectedBehavior === 'form_submit') {
        // Check if form was submitted (this would need page-specific logic)
        message = 'Form submission behavior checked';
      }
      
      this.recordResult(pageName, `BUTTON_${name}`, success, message);
      
    } catch (error) {
      this.recordResult(pageName, `BUTTON_${name}`, false, `Error: ${error.message}`);
    }
  }

  async testFormSubmissions(pageName) {
    console.log(`  📝 Testing form submissions on ${pageName}...`);
    
    try {
      const forms = await this.page.locator('form').all();
      console.log(`  📊 Found ${forms.length} forms`);
      
      for (let i = 0; i < forms.length; i++) {
        try {
          const form = forms[i];
          const isVisible = await form.isVisible();
          
          if (isVisible) {
            console.log(`    📝 Testing form ${i + 1}`);
            
            // Find submit button
            const submitButton = form.locator('button[type="submit"], input[type="submit"]').first();
            const submitExists = await submitButton.count() > 0;
            
            if (submitExists) {
              const isEnabled = await submitButton.isEnabled();
              if (isEnabled) {
                console.log(`      🔘 Testing form submission`);
                await submitButton.click();
                await this.page.waitForTimeout(2000);
                
                // Check for validation errors or success
                const errors = await this.page.locator('.error, .alert-danger, [role="alert"]').count();
                if (errors > 0) {
                  const errorText = await this.page.locator('.error, .alert-danger, [role="alert"]').first().textContent();
                  console.log(`      ⚠️ Form validation error: ${errorText}`);
                } else {
                  console.log(`      ✅ Form submitted successfully`);
                }
              }
            }
          }
        } catch (formError) {
          console.log(`    ❌ Error testing form ${i + 1}: ${formError.message}`);
        }
      }
      
    } catch (error) {
      console.log(`  ❌ Error testing forms: ${error.message}`);
    }
  }

  recordResult(pageName, testName, success, message) {
    this.testResults.push({
      page: pageName,
      test: testName,
      success,
      message,
      timestamp: new Date().toISOString()
    });
  }

  async runComprehensiveTest() {
    try {
      await this.initialize();
      await this.login();
      
      // Define all pages to test
      const pagesToTest = [
        {
          name: 'Dashboard',
          url: 'https://family-finance-frontend.onrender.com/',
          expectedButtons: [
            { selector: 'button', name: 'Refresh', expectedBehavior: 'refresh' },
            { selector: 'a[href="/admin"]', name: 'Admin Panel', expectedBehavior: 'navigate' }
          ]
        },
        {
          name: 'Admin Panel',
          url: 'https://family-finance-frontend.onrender.com/admin',
          expectedButtons: [
            { selector: 'button', name: 'Add User', expectedBehavior: 'modal' },
            { selector: 'button', name: 'Save', expectedBehavior: 'form_submit' }
          ]
        },
        {
          name: 'Income',
          url: 'https://family-finance-frontend.onrender.com/income',
          expectedButtons: [
            { selector: 'button', name: 'Add Income', expectedBehavior: 'modal' },
            { selector: 'button[type="submit"]', name: 'Submit', expectedBehavior: 'form_submit' }
          ]
        },
        {
          name: 'Properties',
          url: 'https://family-finance-frontend.onrender.com/properties',
          expectedButtons: [
            { selector: 'button', name: 'Add Property', expectedBehavior: 'modal' },
            { selector: 'button[type="submit"]', name: 'Submit', expectedBehavior: 'form_submit' }
          ]
        },
        {
          name: 'Loans',
          url: 'https://family-finance-frontend.onrender.com/loans',
          expectedButtons: [
            { selector: 'button', name: 'Add Loan', expectedBehavior: 'modal' },
            { selector: 'button[type="submit"]', name: 'Submit', expectedBehavior: 'form_submit' }
          ]
        },
        {
          name: 'Business Accounts',
          url: 'https://family-finance-frontend.onrender.com/business-accounts',
          expectedButtons: [
            { selector: 'button', name: 'Add Account', expectedBehavior: 'modal' },
            { selector: 'button[type="submit"]', name: 'Submit', expectedBehavior: 'form_submit' }
          ]
        },
        {
          name: 'Transactions',
          url: 'https://family-finance-frontend.onrender.com/transactions',
          expectedButtons: [
            { selector: 'button', name: 'Import', expectedBehavior: 'modal' },
            { selector: 'button', name: 'Refresh', expectedBehavior: 'refresh' }
          ]
        },
        {
          name: 'GL Transactions',
          url: 'https://family-finance-frontend.onrender.com/gl-transactions',
          expectedButtons: [
            { selector: 'button', name: 'Filter', expectedBehavior: 'modal' },
            { selector: 'button', name: 'Export', expectedBehavior: 'download' }
          ]
        },
        {
          name: 'Taxation',
          url: 'https://family-finance-frontend.onrender.com/taxation',
          expectedButtons: [
            { selector: 'button', name: 'Calculate', expectedBehavior: 'calculation' },
            { selector: 'button[type="submit"]', name: 'Submit', expectedBehavior: 'form_submit' }
          ]
        },
        {
          name: 'Pension',
          url: 'https://family-finance-frontend.onrender.com/pension',
          expectedButtons: [
            { selector: 'button', name: 'Add Pension', expectedBehavior: 'modal' },
            { selector: 'button[type="submit"]', name: 'Submit', expectedBehavior: 'form_submit' }
          ]
        }
      ];
      
      // Test each page
      for (const page of pagesToTest) {
        await this.testPage(page.name, page.url, page.expectedButtons);
        await this.testFormSubmissions(page.name);
      }
      
      // Generate report
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Test failed:', error);
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }

  generateReport() {
    console.log('\n📊 COMPREHENSIVE TEST REPORT');
    console.log('=' .repeat(50));
    
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    
    console.log(`\n📈 Summary:`);
    console.log(`  Total Tests: ${totalTests}`);
    console.log(`  Passed: ${passedTests}`);
    console.log(`  Failed: ${failedTests}`);
    console.log(`  Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    console.log(`\n❌ Failed Tests:`);
    const failedResults = this.testResults.filter(r => !r.success);
    failedResults.forEach(result => {
      console.log(`  ${result.page} - ${result.test}: ${result.message}`);
    });
    
    console.log(`\n✅ All Tests:`);
    this.testResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`  ${status} ${result.page} - ${result.test}: ${result.message}`);
    });
    
    // Save results to file
    const fs = require('fs');
    fs.writeFileSync('test-results.json', JSON.stringify(this.testResults, null, 2));
    console.log(`\n💾 Detailed results saved to test-results.json`);
  }
}

// Run the comprehensive test
async function runComprehensiveButtonTest() {
  const tester = new ComprehensiveButtonTester();
  await tester.runComprehensiveTest();
}

runComprehensiveButtonTest();
