const { chromium } = require('playwright');

// Test API performance directly without frontend authentication issues
async function testAPIPerformance() {
  console.log('🚀 Testing API Performance Directly...\n');
  
  const browser = await chromium.launch({ 
    headless: false, 
    slowMo: 500 
  });
  
  const page = await browser.newPage();
  
  try {
    // Login via API first
    console.log('🔐 Logging in via API...');
    const loginResponse = await page.request.post('https://family-finance-api-ycku.onrender.com/api/auth/login', {
      data: {
        email: 'omarosullivan@gmail.com',
        password: 'admin123'
      }
    });
    
    if (loginResponse.status() !== 200) {
      console.error('❌ Login failed:', await loginResponse.text());
      return;
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.access_token;
    console.log('✅ Login successful');
    
    // Test critical API endpoints
    const endpoints = [
      { name: 'Users', url: '/api/users' },
      { name: 'Loans', url: '/api/loans' },
      { name: 'Business Accounts', url: '/api/business-accounts' },
      { name: 'Properties', url: '/api/properties' },
      { name: 'Income', url: '/api/income' },
      { name: 'Pension Accounts', url: '/api/pension-accounts' },
      { name: 'User Dashboard', url: '/api/user-dashboard' },
      { name: 'User Access Loans', url: '/api/user-access/loans/1' },
      { name: 'User Access Accounts', url: '/api/user-access/accounts/1' },
      { name: 'User Access Properties', url: '/api/user-access/properties/1' },
      { name: 'User Access Income', url: '/api/user-access/income/1' },
      { name: 'User Access Pensions', url: '/api/user-access/pensions/1' },
      { name: 'Dashboard Settings', url: '/api/dashboard-settings/1' }
    ];
    
    const results = [];
    
    console.log('\n📊 Testing API Endpoints...');
    
    for (const endpoint of endpoints) {
      const startTime = Date.now();
      
      try {
        const response = await page.request.get(`https://family-finance-api-ycku.onrender.com${endpoint.url}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        const result = {
          name: endpoint.name,
          url: endpoint.url,
          status: response.status(),
          responseTime,
          success: response.status() === 200
        };
        
        results.push(result);
        
        console.log(`  ${result.success ? '✅' : '❌'} ${endpoint.name}: ${response.status()} - ${responseTime}ms`);
        
        if (!result.success) {
          const errorText = await response.text();
          console.log(`    Error: ${errorText.substring(0, 100)}...`);
        }
        
      } catch (error) {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        results.push({
          name: endpoint.name,
          url: endpoint.url,
          status: 'ERROR',
          responseTime,
          success: false,
          error: error.message
        });
        
        console.log(`  ❌ ${endpoint.name}: ERROR - ${responseTime}ms - ${error.message}`);
      }
    }
    
    // Performance analysis
    console.log('\n📋 API Performance Analysis:');
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`Total Endpoints: ${results.length}`);
    console.log(`Successful: ${successful.length}`);
    console.log(`Failed: ${failed.length}`);
    
    if (successful.length > 0) {
      const avgResponseTime = successful.reduce((sum, r) => sum + r.responseTime, 0) / successful.length;
      const maxResponseTime = Math.max(...successful.map(r => r.responseTime));
      const minResponseTime = Math.min(...successful.map(r => r.responseTime));
      
      console.log(`\nResponse Time Statistics:`);
      console.log(`  Average: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`  Min: ${minResponseTime}ms`);
      console.log(`  Max: ${maxResponseTime}ms`);
      
      // Identify slow endpoints
      const slowEndpoints = successful.filter(r => r.responseTime > 3000);
      if (slowEndpoints.length > 0) {
        console.log(`\n🐌 Slow Endpoints (>3000ms):`);
        slowEndpoints.forEach(endpoint => {
          console.log(`  - ${endpoint.name}: ${endpoint.responseTime}ms`);
        });
      }
      
      // Identify very slow endpoints
      const verySlowEndpoints = successful.filter(r => r.responseTime > 5000);
      if (verySlowEndpoints.length > 0) {
        console.log(`\n🚨 Very Slow Endpoints (>5000ms):`);
        verySlowEndpoints.forEach(endpoint => {
          console.log(`  - ${endpoint.name}: ${endpoint.responseTime}ms`);
        });
      }
    }
    
    if (failed.length > 0) {
      console.log(`\n❌ Failed Endpoints:`);
      failed.forEach(endpoint => {
        console.log(`  - ${endpoint.name}: ${endpoint.status} - ${endpoint.error || 'Unknown error'}`);
      });
    }
    
    // Overall assessment
    const criticalIssues = failed.length > 2 || successful.filter(r => r.responseTime > 5000).length > 0;
    
    if (criticalIssues) {
      console.log('\n❌ CRITICAL: Performance issues detected that require immediate attention');
      return false;
    } else if (failed.length > 0 || successful.filter(r => r.responseTime > 3000).length > 0) {
      console.log('\n⚠️  WARNING: Some performance issues detected');
      return true;
    } else {
      console.log('\n✅ SUCCESS: All API endpoints performing well');
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
  testAPIPerformance()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = testAPIPerformance;
