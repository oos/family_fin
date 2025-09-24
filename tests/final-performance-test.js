const { chromium } = require('playwright');

// Comprehensive performance test that will work once authentication is fixed
async function runFinalPerformanceTest() {
  console.log('🚀 Running Final Comprehensive Performance Test...\n');
  
  const browser = await chromium.launch({ 
    headless: false, 
    slowMo: 1000 
  });
  
  const page = await browser.newPage();
  
  try {
    // Test 1: Authentication Flow
    console.log('🔐 Testing Authentication Flow...');
    const authStartTime = Date.now();
    
    await page.goto('https://family-finance-frontend.onrender.com/login');
    await page.waitForSelector('input[type="email"]');
    await page.fill('input[type="email"]', 'omarosullivan@gmail.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Wait for navigation away from login
    await page.waitForFunction(() => !window.location.href.includes('/login'), { timeout: 15000 });
    
    const authEndTime = Date.now();
    const authTime = authEndTime - authStartTime;
    
    console.log(`✅ Authentication completed in ${authTime}ms`);
    
    // Test 2: AdminPanel Performance
    console.log('\n📊 Testing AdminPanel Performance...');
    const adminStartTime = Date.now();
    
    await page.goto('https://family-finance-frontend.onrender.com/admin?tab=loans');
    
    // Wait for data to load
    await page.waitForLoadState('networkidle');
    
    // Wait for loading indicators to disappear
    try {
      await page.waitForSelector('.spinner-border', { state: 'hidden', timeout: 10000 });
    } catch (e) {
      // Loading indicator might not be present
    }
    
    const adminEndTime = Date.now();
    const adminLoadTime = adminEndTime - adminStartTime;
    
    // Check for data tables
    const tableCount = await page.locator('table').count();
    const hasData = tableCount > 0;
    
    console.log(`✅ AdminPanel loaded in ${adminLoadTime}ms`);
    console.log(`📊 Data tables found: ${tableCount}`);
    
    // Test 3: All Admin Tabs Performance
    console.log('\n🔄 Testing All Admin Tabs...');
    
    const adminTabs = [
      { name: 'Permissions', path: '/admin?tab=permissions' },
      { name: 'Loans', path: '/admin?tab=loans' },
      { name: 'Bank Accounts', path: '/admin?tab=bank-accounts' },
      { name: 'Properties', path: '/admin?tab=properties' },
      { name: 'Income', path: '/admin?tab=income' },
      { name: 'Pensions', path: '/admin?tab=pensions' }
    ];
    
    const tabResults = [];
    
    for (const tab of adminTabs) {
      const tabStartTime = Date.now();
      
      await page.goto(`https://family-finance-frontend.onrender.com${tab.path}`);
      await page.waitForLoadState('networkidle');
      
      const tabEndTime = Date.now();
      const tabLoadTime = tabEndTime - tabStartTime;
      
      tabResults.push({
        name: tab.name,
        loadTime: tabLoadTime
      });
      
      console.log(`  ${tab.name}: ${tabLoadTime}ms`);
    }
    
    // Test 4: Other Critical Pages
    console.log('\n📄 Testing Other Critical Pages...');
    
    const otherPages = [
      { name: 'Dashboard', path: '/dashboard' },
      { name: 'Properties', path: '/properties' },
      { name: 'Loans', path: '/loans' },
      { name: 'Income', path: '/income' },
      { name: 'Transactions', path: '/transactions' }
    ];
    
    const pageResults = [];
    
    for (const pageInfo of otherPages) {
      const pageStartTime = Date.now();
      
      await page.goto(`https://family-finance-frontend.onrender.com${pageInfo.path}`);
      await page.waitForLoadState('networkidle');
      
      const pageEndTime = Date.now();
      const pageLoadTime = pageEndTime - pageStartTime;
      
      pageResults.push({
        name: pageInfo.name,
        loadTime: pageLoadTime
      });
      
      console.log(`  ${pageInfo.name}: ${pageLoadTime}ms`);
    }
    
    // Performance Analysis
    console.log('\n📋 Performance Analysis:');
    
    const allResults = [
      { name: 'Authentication', loadTime: authTime },
      { name: 'AdminPanel', loadTime: adminLoadTime },
      ...tabResults,
      ...pageResults
    ];
    
    const avgLoadTime = allResults.reduce((sum, r) => sum + r.loadTime, 0) / allResults.length;
    const maxLoadTime = Math.max(...allResults.map(r => r.loadTime));
    const minLoadTime = Math.min(...allResults.map(r => r.loadTime));
    
    console.log(`\nOverall Performance:`);
    console.log(`  Average Load Time: ${avgLoadTime.toFixed(2)}ms`);
    console.log(`  Min Load Time: ${minLoadTime}ms`);
    console.log(`  Max Load Time: ${maxLoadTime}ms`);
    
    // Identify slow pages
    const slowPages = allResults.filter(r => r.loadTime > 5000);
    if (slowPages.length > 0) {
      console.log(`\n🐌 Slow Pages (>5000ms):`);
      slowPages.forEach(page => {
        console.log(`  - ${page.name}: ${page.loadTime}ms`);
      });
    }
    
    // Performance assessment
    const criticalIssues = slowPages.length > 2 || adminLoadTime > 10000 || !hasData;
    
    if (criticalIssues) {
      console.log('\n❌ CRITICAL: Performance issues detected');
      return false;
    } else if (slowPages.length > 0 || adminLoadTime > 5000) {
      console.log('\n⚠️  WARNING: Some performance issues detected');
      return true;
    } else {
      console.log('\n✅ SUCCESS: All performance tests passed');
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
  runFinalPerformanceTest()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = runFinalPerformanceTest;
