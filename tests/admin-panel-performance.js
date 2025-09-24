const { chromium } = require('playwright');

// Configuration
const BASE_URL = 'https://family-finance-frontend.onrender.com';
const ADMIN_CREDENTIALS = {
  email: 'omarosullivan@gmail.com',
  password: 'admin123'
};

async function testAdminPanelPerformance() {
  console.log('🚀 Testing AdminPanel Performance...\n');
  
  const browser = await chromium.launch({ 
    headless: false, // Set to true for CI
    slowMo: 500 
  });
  
  const page = await browser.newPage();
  
  try {
    // Navigate to login
    console.log('🔐 Navigating to login page...');
    await page.goto(`${BASE_URL}/login`);
    
    // Wait for login form
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    // Fill credentials
    console.log('📝 Filling login credentials...');
    await page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
    await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
    
    // Click login
    console.log('🔑 Clicking login button...');
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    console.log('⏳ Waiting for login to complete...');
    await page.waitForLoadState('networkidle');
    
    // Test AdminPanel Loans tab specifically
    console.log('\n📊 Testing AdminPanel Loans tab...');
    const startTime = Date.now();
    
    // Navigate to AdminPanel Loans tab
    await page.goto(`${BASE_URL}/admin?tab=loans`);
    
    // Set up performance monitoring
    await page.evaluate(() => {
      window.performanceMetrics = {
        startTime: performance.now(),
        networkRequests: [],
        errors: [],
        apiCalls: []
      };
    });

    // Monitor network requests
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        page.evaluate((url) => {
          window.performanceMetrics.apiCalls.push({
            url,
            timestamp: performance.now()
          });
        }, request.url());
      }
    });

    // Monitor console errors
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

    // Wait for page to load completely
    await page.waitForLoadState('networkidle');
    
    // Wait for any loading indicators to disappear
    try {
      await page.waitForSelector('.spinner-border', { state: 'hidden', timeout: 10000 });
      console.log('✅ Loading indicators disappeared');
    } catch (e) {
      console.log('⚠️  No loading indicators found or timeout');
    }

    // Wait for data tables to be populated
    try {
      await page.waitForSelector('table', { timeout: 10000 });
      console.log('✅ Data tables loaded');
    } catch (e) {
      console.log('⚠️  No data tables found or timeout');
    }

    const endTime = Date.now();
    const totalLoadTime = endTime - startTime;

    // Get performance metrics
    const metrics = await page.evaluate(() => {
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

    // Log results
    console.log('\n📊 AdminPanel Performance Results:');
    console.log(`⏱️  Total Load Time: ${totalLoadTime}ms`);
    console.log(`🎨 First Contentful Paint: ${metrics.firstContentfulPaint.toFixed(2)}ms`);
    console.log(`🖼️  Largest Contentful Paint: ${metrics.largestContentfulPaint.toFixed(2)}ms`);
    console.log(`🌐 API Calls: ${metrics.apiCalls.length}`);
    console.log(`❌ Errors: ${metrics.errors.length}`);
    
    if (metrics.errors.length > 0) {
      console.log('\n🚨 Errors found:');
      metrics.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.error}`);
      });
    }

    // Performance assessment
    const thresholds = {
      pageLoad: 5000,
      firstContentfulPaint: 2000,
      largestContentfulPaint: 4000
    };

    console.log('\n📋 Performance Assessment:');
    
    if (totalLoadTime > thresholds.pageLoad) {
      console.log(`❌ Page load time (${totalLoadTime}ms) exceeds threshold (${thresholds.pageLoad}ms)`);
    } else {
      console.log(`✅ Page load time (${totalLoadTime}ms) is within threshold (${thresholds.pageLoad}ms)`);
    }

    if (metrics.firstContentfulPaint > thresholds.firstContentfulPaint) {
      console.log(`❌ First Contentful Paint (${metrics.firstContentfulPaint.toFixed(2)}ms) exceeds threshold (${thresholds.firstContentfulPaint}ms)`);
    } else {
      console.log(`✅ First Contentful Paint (${metrics.firstContentfulPaint.toFixed(2)}ms) is within threshold (${thresholds.firstContentfulPaint}ms)`);
    }

    if (metrics.largestContentfulPaint > thresholds.largestContentfulPaint) {
      console.log(`❌ Largest Contentful Paint (${metrics.largestContentfulPaint.toFixed(2)}ms) exceeds threshold (${thresholds.largestContentfulPaint}ms)`);
    } else {
      console.log(`✅ Largest Contentful Paint (${metrics.largestContentfulPaint.toFixed(2)}ms) is within threshold (${thresholds.largestContentfulPaint}ms)`);
    }

    if (metrics.errors.length > 0) {
      console.log(`❌ Found ${metrics.errors.length} console errors`);
    } else {
      console.log(`✅ No console errors found`);
    }

    // Overall assessment
    const hasIssues = totalLoadTime > thresholds.pageLoad || 
                     metrics.firstContentfulPaint > thresholds.firstContentfulPaint ||
                     metrics.largestContentfulPaint > thresholds.largestContentfulPaint ||
                     metrics.errors.length > 0;

    if (hasIssues) {
      console.log('\n⚠️  Performance issues detected that need attention');
      return false;
    } else {
      console.log('\n✅ All performance metrics are within acceptable thresholds');
      return true;
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  } finally {
    await browser.close();
  }
}

// Run the test
if (require.main === module) {
  testAdminPanelPerformance()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = testAdminPanelPerformance;
