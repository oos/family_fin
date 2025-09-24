const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'https://family-finance-frontend.onrender.com';
const API_URL = 'https://family-finance-api-ycku.onrender.com';
const ADMIN_CREDENTIALS = {
  email: 'omarosullivan@gmail.com',
  password: 'admin123'
};

// Performance thresholds
const THRESHOLDS = {
  pageLoad: 5000,
  apiResponse: 3000,
  firstContentfulPaint: 2000,
  largestContentfulPaint: 4000
};

class PerformanceMonitor {
  constructor() {
    this.results = [];
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    this.browser = await chromium.launch({ 
      headless: false, // Set to true for CI/CD
      slowMo: 1000 // Slow down for better observation
    });
    this.page = await this.browser.newPage();
    
    // Enable performance monitoring
    await this.page.coverage.startJSCoverage();
    await this.page.coverage.startCSSCoverage();
  }

  async login() {
    console.log('🔐 Logging in...');
    
    try {
      await this.page.goto(`${BASE_URL}/login`);
      
      // Wait for login form to be visible
      await this.page.waitForSelector('input[type="email"]', { timeout: 10000 });
      
      // Fill in credentials
      await this.page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
      await this.page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
      
      // Click login button
      await this.page.click('button[type="submit"]');
      
      // Wait for navigation - be more flexible with URL matching
      await Promise.race([
        this.page.waitForURL(/dashboard/, { timeout: 15000 }),
        this.page.waitForURL(/admin/, { timeout: 15000 }),
        this.page.waitForURL(/\/$/, { timeout: 15000 }) // Root page after login
      ]);
      
      // Additional wait to ensure page is fully loaded
      await this.page.waitForLoadState('networkidle');
      
      console.log('✅ Login successful');
    } catch (error) {
      console.log('⚠️  Login timeout, continuing with current page...');
      // Continue even if login times out - some pages might be accessible
    }
  }

  async measurePagePerformance(pageName, pagePath) {
    console.log(`\n📊 Testing ${pageName}...`);
    
    const startTime = Date.now();
    
    // Set up performance monitoring
    await this.page.evaluate(() => {
      window.performanceMetrics = {
        startTime: performance.now(),
        networkRequests: [],
        errors: [],
        apiCalls: []
      };
    });

    // Monitor network requests
    this.page.on('request', request => {
      if (request.url().includes('/api/')) {
        this.page.evaluate((url) => {
          window.performanceMetrics.apiCalls.push({
            url,
            timestamp: performance.now()
          });
        }, request.url());
      }
    });

    // Monitor console errors
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        this.page.evaluate((error) => {
          window.performanceMetrics.errors.push({
            error,
            timestamp: performance.now()
          });
        }, msg.text());
      }
    });

    // Navigate to page
    await this.page.goto(`${BASE_URL}${pagePath}`);
    
    // Wait for page to load completely
    await this.page.waitForLoadState('networkidle');
    
    // Wait for any loading indicators to disappear
    try {
      await this.page.waitForSelector('.spinner-border', { state: 'hidden', timeout: 5000 });
    } catch (e) {
      // Loading indicator might not be present
    }

    const endTime = Date.now();
    const totalLoadTime = endTime - startTime;

    // Get performance metrics
    const metrics = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      const paint = performance.getEntriesByType('paint');
      const fcp = paint.find(entry => entry.name === 'first-contentful-paint');
      const lcp = performance.getEntriesByType('largest-contentful-paint');
      
      return {
        loadTime: navigation ? navigation.loadEventEnd - navigation.loadEventStart : 0,
        domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart : 0,
        firstContentfulPaint: fcp ? fcp.startTime : 0,
        largestContentfulPaint: lcp.length > 0 ? lcp[lcp.length - 1].startTime : 0,
        networkRequests: window.performanceMetrics?.networkRequests || [],
        apiCalls: window.performanceMetrics?.apiCalls || [],
        errors: window.performanceMetrics?.errors || []
      };
    });

    const result = {
      pageName,
      pagePath,
      totalLoadTime,
      ...metrics,
      timestamp: new Date().toISOString()
    };

    this.results.push(result);
    
    // Log results
    console.log(`  ⏱️  Total Load Time: ${result.totalLoadTime}ms`);
    console.log(`  🎨 First Contentful Paint: ${result.firstContentfulPaint.toFixed(2)}ms`);
    console.log(`  🖼️  Largest Contentful Paint: ${result.largestContentfulPaint.toFixed(2)}ms`);
    console.log(`  🌐 API Calls: ${result.apiCalls.length}`);
    console.log(`  ❌ Errors: ${result.errors.length}`);
    
    if (result.errors.length > 0) {
      console.log('  🚨 Errors:', result.errors.map(e => e.error).join(', '));
    }

    return result;
  }

  async testAllPages() {
    const pages = [
      { name: 'Login', path: '/login' },
      { name: 'Dashboard', path: '/dashboard' },
      { name: 'Admin Panel - Permissions', path: '/admin?tab=permissions' },
      { name: 'Admin Panel - Loans', path: '/admin?tab=loans' },
      { name: 'Admin Panel - Bank Accounts', path: '/admin?tab=bank-accounts' },
      { name: 'Admin Panel - Properties', path: '/admin?tab=properties' },
      { name: 'Admin Panel - Income', path: '/admin?tab=income' },
      { name: 'Admin Panel - Pensions', path: '/admin?tab=pensions' },
      { name: 'Properties', path: '/properties' },
      { name: 'Loans', path: '/loans' },
      { name: 'Income', path: '/income' },
      { name: 'People', path: '/people' },
      { name: 'Families', path: '/families' },
      { name: 'Transactions', path: '/transactions' },
      { name: 'GL Transactions', path: '/gl-transactions' },
      { name: 'Pension', path: '/pension' },
      { name: 'Taxation', path: '/taxation' },
      { name: 'Company Taxation', path: '/company-taxation' },
      { name: 'Company Pension Calculator', path: '/company-pension' },
      { name: 'Loan Calculator', path: '/loan-calculator' },
      { name: 'Net Worth', path: '/net-worth' },
      { name: 'Tax Returns', path: '/tax-returns' },
      { name: 'Bookings', path: '/bookings' },
      { name: 'Transaction Matching', path: '/transaction-matching' },
      { name: 'Transaction Predictions', path: '/transaction-predictions' },
      { name: 'Pension Accounts', path: '/pension-accounts' },
      { name: 'File Viewer', path: '/file-viewer' }
    ];

    console.log(`🚀 Starting performance testing for ${pages.length} pages...\n`);

    for (const page of pages) {
      try {
        await this.measurePagePerformance(page.name, page.path);
        
        // Small delay between pages
        await this.page.waitForTimeout(1000);
      } catch (error) {
        console.error(`❌ Error testing ${page.name}:`, error.message);
        this.results.push({
          pageName: page.name,
          pagePath: page.path,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  async testAPIEndpoints() {
    console.log('\n🔌 Testing API endpoints...');
    
    const endpoints = [
      '/api/loans',
      '/api/business-accounts',
      '/api/properties',
      '/api/income',
      '/api/pension-accounts',
      '/api/users',
      '/api/people',
      '/api/families',
      '/api/dashboard-settings/1',
      '/api/user-access/loans/1',
      '/api/user-access/accounts/1',
      '/api/user-access/properties/1',
      '/api/user-access/income/1',
      '/api/user-access/pensions/1'
    ];

    const apiResults = [];

    for (const endpoint of endpoints) {
      try {
        const startTime = Date.now();
        const response = await this.page.request.get(`${API_URL}${endpoint}`);
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        apiResults.push({
          endpoint,
          status: response.status(),
          responseTime,
          success: response.status() === 200
        });

        console.log(`  ${endpoint}: ${response.status()} - ${responseTime}ms`);
      } catch (error) {
        console.error(`  ❌ ${endpoint}: ERROR - ${error.message}`);
        apiResults.push({
          endpoint,
          status: 'ERROR',
          responseTime: -1,
          success: false,
          error: error.message
        });
      }
    }

    return apiResults;
  }

  generateReport() {
    console.log('\n📋 Generating Performance Report...\n');

    // Page performance summary
    const successfulPages = this.results.filter(r => !r.error);
    const failedPages = this.results.filter(r => r.error);
    
    console.log('=== PAGE PERFORMANCE SUMMARY ===');
    console.log(`Total Pages Tested: ${this.results.length}`);
    console.log(`Successful: ${successfulPages.length}`);
    console.log(`Failed: ${failedPages.length}`);

    if (successfulPages.length > 0) {
      const avgLoadTime = successfulPages.reduce((sum, r) => sum + r.totalLoadTime, 0) / successfulPages.length;
      const avgFCP = successfulPages.reduce((sum, r) => sum + r.firstContentfulPaint, 0) / successfulPages.length;
      const avgLCP = successfulPages.reduce((sum, r) => sum + r.largestContentfulPaint, 0) / successfulPages.length;
      
      console.log(`\nAverage Load Time: ${avgLoadTime.toFixed(2)}ms`);
      console.log(`Average FCP: ${avgFCP.toFixed(2)}ms`);
      console.log(`Average LCP: ${avgLCP.toFixed(2)}ms`);

      // Performance issues
      const slowPages = successfulPages.filter(r => r.totalLoadTime > THRESHOLDS.pageLoad);
      const slowFCP = successfulPages.filter(r => r.firstContentfulPaint > THRESHOLDS.firstContentfulPaint);
      const slowLCP = successfulPages.filter(r => r.largestContentfulPaint > THRESHOLDS.largestContentfulPaint);

      if (slowPages.length > 0) {
        console.log(`\n🐌 Slow Pages (>${THRESHOLDS.pageLoad}ms):`);
        slowPages.forEach(page => {
          console.log(`  - ${page.pageName}: ${page.totalLoadTime}ms`);
        });
      }

      if (slowFCP.length > 0) {
        console.log(`\n🎨 Slow First Contentful Paint (>${THRESHOLDS.firstContentfulPaint}ms):`);
        slowFCP.forEach(page => {
          console.log(`  - ${page.pageName}: ${page.firstContentfulPaint.toFixed(2)}ms`);
        });
      }

      if (slowLCP.length > 0) {
        console.log(`\n🖼️  Slow Largest Contentful Paint (>${THRESHOLDS.largestContentfulPaint}ms):`);
        slowLCP.forEach(page => {
          console.log(`  - ${page.pageName}: ${page.largestContentfulPaint.toFixed(2)}ms`);
        });
      }

      // Error summary
      const pagesWithErrors = successfulPages.filter(r => r.errors && r.errors.length > 0);
      if (pagesWithErrors.length > 0) {
        console.log(`\n❌ Pages with Errors:`);
        pagesWithErrors.forEach(page => {
          console.log(`  - ${page.pageName}: ${page.errors.length} errors`);
        });
      }
    }

    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalPages: this.results.length,
        successful: successfulPages.length,
        failed: failedPages.length,
        avgLoadTime: successfulPages.length > 0 ? 
          successfulPages.reduce((sum, r) => sum + r.totalLoadTime, 0) / successfulPages.length : 0
      },
      pages: this.results,
      thresholds: THRESHOLDS
    };

    const reportPath = path.join(__dirname, '..', 'performance-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);

    return report;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Main execution
async function main() {
  const monitor = new PerformanceMonitor();
  
  try {
    await monitor.initialize();
    await monitor.login();
    await monitor.testAllPages();
    
    const apiResults = await monitor.testAPIEndpoints();
    console.log(`\nAPI Results: ${apiResults.filter(r => r.success).length}/${apiResults.length} successful`);
    
    const report = monitor.generateReport();
    
    // Exit with error code if there are performance issues
    const hasIssues = report.summary.failed > 0 || 
                     report.summary.avgLoadTime > THRESHOLDS.pageLoad;
    
    if (hasIssues) {
      console.log('\n⚠️  Performance issues detected!');
      process.exit(1);
    } else {
      console.log('\n✅ All performance tests passed!');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('❌ Performance testing failed:', error);
    process.exit(1);
  } finally {
    await monitor.cleanup();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = PerformanceMonitor;
