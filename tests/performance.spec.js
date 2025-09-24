const { test, expect } = require('@playwright/test');

// Test configuration
const BASE_URL = 'https://family-finance-frontend.onrender.com';
const API_URL = 'https://family-finance-api-ycku.onrender.com';
const ADMIN_CREDENTIALS = {
  email: 'omarosullivan@gmail.com',
  password: 'admin123'
};

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  pageLoad: 5000, // 5 seconds
  apiResponse: 3000, // 3 seconds
  firstContentfulPaint: 2000, // 2 seconds
  largestContentfulPaint: 4000, // 4 seconds
  cumulativeLayoutShift: 0.1, // 0.1
  firstInputDelay: 100, // 100ms
};

// All pages to test
const PAGES_TO_TEST = [
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
  { name: 'File Viewer', path: '/file-viewer' },
];

// Helper function to login
async function login(page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
  await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
  await page.click('button[type="submit"]');
  
  // Wait for login to complete
  await page.waitForURL(/dashboard|admin/, { timeout: 10000 });
}

// Helper function to measure performance
async function measurePagePerformance(page, pageName) {
  const startTime = Date.now();
  
  // Start performance measurement
  await page.evaluate(() => {
    window.performanceMetrics = {
      startTime: performance.now(),
      networkRequests: [],
      errors: []
    };
  });

  // Listen for network requests
  page.on('request', request => {
    page.evaluate((url) => {
      window.performanceMetrics.networkRequests.push({
        url,
        timestamp: performance.now()
      });
    }, request.url());
  });

  // Listen for console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      page.evaluate((error) => {
        window.performanceMetrics.errors.push({
          error,
          timestamp: performance.now()
        });
      }, msg.text());
    }
  });

  // Wait for page to be fully loaded
  await page.waitForLoadState('networkidle');
  
  const endTime = Date.now();
  const totalLoadTime = endTime - startTime;

  // Get Core Web Vitals
  const metrics = await page.evaluate(() => {
    return new Promise((resolve) => {
      // Wait for performance metrics to be available
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        const paint = performance.getEntriesByType('paint');
        
        const fcp = paint.find(entry => entry.name === 'first-contentful-paint');
        const lcp = performance.getEntriesByType('largest-contentful-paint');
        
        resolve({
          loadTime: navigation ? navigation.loadEventEnd - navigation.loadEventStart : 0,
          domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart : 0,
          firstContentfulPaint: fcp ? fcp.startTime : 0,
          largestContentfulPaint: lcp.length > 0 ? lcp[lcp.length - 1].startTime : 0,
          networkRequests: window.performanceMetrics?.networkRequests || [],
          errors: window.performanceMetrics?.errors || []
        });
      }, 1000);
    });
  });

  return {
    pageName,
    totalLoadTime,
    ...metrics
  };
}

// Test each page individually
PAGES_TO_TEST.forEach(({ name, path }) => {
  test(`Performance Test: ${name}`, async ({ page }) => {
    // Login first
    await login(page);
    
    // Navigate to the page
    const startTime = Date.now();
    await page.goto(path);
    
    // Measure performance
    const performance = await measurePagePerformance(page, name);
    
    // Log performance metrics
    console.log(`\n=== ${name} Performance Report ===`);
    console.log(`Total Load Time: ${performance.totalLoadTime}ms`);
    console.log(`DOM Content Loaded: ${performance.domContentLoaded}ms`);
    console.log(`First Contentful Paint: ${performance.firstContentfulPaint}ms`);
    console.log(`Largest Contentful Paint: ${performance.largestContentfulPaint}ms`);
    console.log(`Network Requests: ${performance.networkRequests.length}`);
    console.log(`Errors: ${performance.errors.length}`);
    
    if (performance.errors.length > 0) {
      console.log('Errors:', performance.errors);
    }
    
    // Performance assertions
    expect(performance.totalLoadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoad);
    expect(performance.firstContentfulPaint).toBeLessThan(PERFORMANCE_THRESHOLDS.firstContentfulPaint);
    expect(performance.largestContentfulPaint).toBeLessThan(PERFORMANCE_THRESHOLDS.largestContentfulPaint);
    
    // Check for critical errors
    const criticalErrors = performance.errors.filter(error => 
      error.error.includes('CORS') || 
      error.error.includes('ERR_FAILED') ||
      error.error.includes('Network Error')
    );
    
    expect(criticalErrors.length).toBe(0);
  });
});

// Comprehensive AdminPanel performance test
test('AdminPanel Comprehensive Performance Test', async ({ page }) => {
  await login(page);
  
  // Test AdminPanel with all tabs
  const adminTabs = [
    { name: 'Permissions', path: '/admin?tab=permissions' },
    { name: 'Loans', path: '/admin?tab=loans' },
    { name: 'Bank Accounts', path: '/admin?tab=bank-accounts' },
    { name: 'Properties', path: '/admin?tab=properties' },
    { name: 'Income', path: '/admin?tab=income' },
    { name: 'Pensions', path: '/admin?tab=pensions' }
  ];
  
  const results = [];
  
  for (const tab of adminTabs) {
    console.log(`\nTesting AdminPanel ${tab.name} tab...`);
    
    const startTime = Date.now();
    await page.goto(tab.path);
    
    // Wait for data to load (look for loading indicators to disappear)
    try {
      await page.waitForSelector('.spinner-border', { state: 'hidden', timeout: 10000 });
    } catch (e) {
      // Loading indicator might not be present
    }
    
    // Wait for data tables to be populated
    await page.waitForLoadState('networkidle');
    
    const endTime = Date.now();
    const loadTime = endTime - startTime;
    
    // Check for errors in console
    const errors = await page.evaluate(() => {
      return window.performanceMetrics?.errors || [];
    });
    
    results.push({
      tab: tab.name,
      loadTime,
      errors: errors.length
    });
    
    console.log(`${tab.name}: ${loadTime}ms, Errors: ${errors.length}`);
    
    // Assert performance thresholds
    expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoad);
  }
  
  // Generate summary report
  console.log('\n=== AdminPanel Performance Summary ===');
  results.forEach(result => {
    console.log(`${result.tab}: ${result.loadTime}ms (${result.errors} errors)`);
  });
  
  const totalErrors = results.reduce((sum, result) => sum + result.errors, 0);
  const avgLoadTime = results.reduce((sum, result) => sum + result.loadTime, 0) / results.length;
  
  console.log(`Average Load Time: ${avgLoadTime.toFixed(2)}ms`);
  console.log(`Total Errors: ${totalErrors}`);
  
  expect(totalErrors).toBe(0);
  expect(avgLoadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoad);
});

// API Performance Test
test('API Performance Test', async ({ page }) => {
  await login(page);
  
  // Test critical API endpoints
  const apiEndpoints = [
    '/api/loans',
    '/api/business-accounts',
    '/api/properties',
    '/api/income',
    '/api/pension-accounts',
    '/api/users',
    '/api/people',
    '/api/families'
  ];
  
  const results = [];
  
  for (const endpoint of apiEndpoints) {
    const startTime = Date.now();
    
    try {
      const response = await page.request.get(`${API_URL}${endpoint}`);
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      results.push({
        endpoint,
        status: response.status(),
        responseTime
      });
      
      console.log(`${endpoint}: ${response.status()} - ${responseTime}ms`);
      
      expect(response.status()).toBe(200);
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.apiResponse);
      
    } catch (error) {
      console.error(`Error testing ${endpoint}:`, error);
      results.push({
        endpoint,
        status: 'ERROR',
        responseTime: -1
      });
    }
  }
  
  // Generate API performance summary
  console.log('\n=== API Performance Summary ===');
  const successfulRequests = results.filter(r => r.status === 200);
  const avgResponseTime = successfulRequests.reduce((sum, r) => sum + r.responseTime, 0) / successfulRequests.length;
  
  console.log(`Successful Requests: ${successfulRequests.length}/${results.length}`);
  console.log(`Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
  
  expect(successfulRequests.length).toBe(results.length);
  expect(avgResponseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.apiResponse);
});
