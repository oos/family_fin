const { chromium } = require('playwright');

class ComprehensiveTestWithAuthIssues {
  constructor() {
    this.browser = null;
    this.page = null;
    this.testResults = [];
  }

  async initialize() {
    console.log('🚀 Initializing Comprehensive Test (With Auth Issues)...\n');
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
  }

  async testLoginPage() {
    console.log('🔐 Testing Login Page...');
    
    try {
      await this.page.goto('https://family-finance-frontend.onrender.com/login');
      await this.page.waitForLoadState('networkidle');
      
      // Test login form elements
      const emailInput = this.page.locator('input[type="email"]');
      const passwordInput = this.page.locator('input[type="password"]');
      const loginButton = this.page.locator('button[type="submit"]');
      const eyeButton = this.page.locator('button[onclick]');
      
      // Check if elements are present
      const emailPresent = await emailInput.count() > 0;
      const passwordPresent = await passwordInput.count() > 0;
      const loginButtonPresent = await loginButton.count() > 0;
      const eyeButtonPresent = await eyeButton.count() > 0;
      
      this.recordResult('Login Page', 'Email Input Present', emailPresent, emailPresent ? 'Email input found' : 'Email input not found');
      this.recordResult('Login Page', 'Password Input Present', passwordPresent, passwordPresent ? 'Password input found' : 'Password input not found');
      this.recordResult('Login Page', 'Login Button Present', loginButtonPresent, loginButtonPresent ? 'Login button found' : 'Login button not found');
      this.recordResult('Login Page', 'Eye Button Present', eyeButtonPresent, eyeButtonPresent ? 'Eye button found' : 'Eye button not found');
      
      // Test eye button functionality
      if (eyeButtonPresent) {
        try {
          await eyeButton.click();
          await this.page.waitForTimeout(1000);
          this.recordResult('Login Page', 'Eye Button Click', true, 'Eye button clicked successfully');
        } catch (error) {
          this.recordResult('Login Page', 'Eye Button Click', false, `Eye button click failed: ${error.message}`);
        }
      }
      
      // Test form submission (even though it will fail due to auth issues)
      if (emailPresent && passwordPresent && loginButtonPresent) {
        try {
          await emailInput.fill('omarosullivan@gmail.com');
          await passwordInput.fill('admin123');
          await loginButton.click();
          await this.page.waitForTimeout(3000);
          
          const currentUrl = this.page.url();
          if (currentUrl.includes('/login')) {
            this.recordResult('Login Page', 'Form Submission', false, 'Form submission failed - still on login page');
          } else {
            this.recordResult('Login Page', 'Form Submission', true, 'Form submission successful - redirected');
          }
        } catch (error) {
          this.recordResult('Login Page', 'Form Submission', false, `Form submission error: ${error.message}`);
        }
      }
      
    } catch (error) {
      this.recordResult('Login Page', 'Page Load', false, `Error: ${error.message}`);
    }
  }

  async testPageAccess() {
    console.log('📚 Testing Page Access...');
    
    const pagesToTest = [
      { name: 'Dashboard', url: '/' },
      { name: 'Admin Panel', url: '/admin' },
      { name: 'Income', url: '/income' },
      { name: 'Properties', url: '/properties' },
      { name: 'Loans', url: '/loans' },
      { name: 'Business Accounts', url: '/business-accounts' },
      { name: 'Transactions', url: '/transactions' },
      { name: 'GL Transactions', url: '/gl-transactions' },
      { name: 'Taxation', url: '/taxation' },
      { name: 'Pension', url: '/pension' },
      { name: 'Company Pension', url: '/company-pension' },
      { name: 'Tax Returns', url: '/tax-returns' },
      { name: 'Transaction Matching', url: '/transaction-matching' },
      { name: 'Transaction Predictions', url: '/transaction-predictions' },
      { name: 'Bookings', url: '/bookings' },
      { name: 'File Viewer', url: '/files' }
    ];
    
    for (const pageInfo of pagesToTest) {
      try {
        console.log(`  🔗 Testing ${pageInfo.name}...`);
        await this.page.goto(`https://family-finance-frontend.onrender.com${pageInfo.url}`);
        await this.page.waitForLoadState('networkidle');
        await this.page.waitForTimeout(2000);
        
        const finalUrl = this.page.url();
        const pageTitle = await this.page.title();
        
        if (finalUrl.includes('/login')) {
          this.recordResult(pageInfo.name, 'Page Access', false, 'Redirected to login - authentication required');
        } else if (finalUrl.includes(pageInfo.url) || finalUrl.endsWith('/')) {
          this.recordResult(pageInfo.name, 'Page Access', true, 'Page loaded successfully');
          
          // Test page elements
          await this.testPageElements(pageInfo.name);
        } else {
          this.recordResult(pageInfo.name, 'Page Access', false, `Unexpected redirect to: ${finalUrl}`);
        }
        
      } catch (error) {
        this.recordResult(pageInfo.name, 'Page Access', false, `Error: ${error.message}`);
      }
    }
  }

  async testPageElements(pageName) {
    console.log(`    🔍 Testing elements on ${pageName}...`);
    
    try {
      // Test for common elements
      const buttons = await this.page.locator('button, input[type="button"], input[type="submit"], a[role="button"]').all();
      const forms = await this.page.locator('form').all();
      const inputs = await this.page.locator('input, select, textarea').all();
      const tables = await this.page.locator('table').all();
      const modals = await this.page.locator('.modal, [role="dialog"]').all();
      
      this.recordResult(pageName, 'Buttons Found', buttons.length > 0, `Found ${buttons.length} buttons`);
      this.recordResult(pageName, 'Forms Found', forms.length > 0, `Found ${forms.length} forms`);
      this.recordResult(pageName, 'Inputs Found', inputs.length > 0, `Found ${inputs.length} inputs`);
      this.recordResult(pageName, 'Tables Found', tables.length > 0, `Found ${tables.length} tables`);
      this.recordResult(pageName, 'Modals Found', modals.length > 0, `Found ${modals.length} modals`);
      
      // Test first few buttons
      for (let i = 0; i < Math.min(buttons.length, 5); i++) {
        try {
          const button = buttons[i];
          const isVisible = await button.isVisible();
          const isEnabled = await button.isEnabled();
          const text = await button.textContent();
          
          if (isVisible && isEnabled && text && text.trim()) {
            console.log(`      🔘 Testing button: "${text.trim()}"`);
            try {
              await button.click();
              await this.page.waitForTimeout(1000);
              this.recordResult(pageName, `Button "${text.trim()}"`, true, 'Button clicked successfully');
            } catch (clickError) {
              this.recordResult(pageName, `Button "${text.trim()}"`, false, `Click failed: ${clickError.message}`);
            }
          }
        } catch (buttonError) {
          this.recordResult(pageName, `Button ${i + 1}`, false, `Error: ${buttonError.message}`);
        }
      }
      
    } catch (error) {
      this.recordResult(pageName, 'Element Testing', false, `Error: ${error.message}`);
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
      await this.testLoginPage();
      await this.testPageAccess();
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
    fs.writeFileSync('comprehensive-test-results.json', JSON.stringify(this.testResults, null, 2));
    console.log(`\n💾 Detailed results saved to comprehensive-test-results.json`);
  }
}

// Run the comprehensive test
async function runComprehensiveTestWithAuthIssues() {
  const tester = new ComprehensiveTestWithAuthIssues();
  await tester.runComprehensiveTest();
}

runComprehensiveTestWithAuthIssues();
