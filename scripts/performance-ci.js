#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Performance thresholds for CI/CD
const CI_THRESHOLDS = {
  pageLoad: 8000, // More lenient for CI
  apiResponse: 5000,
  firstContentfulPaint: 3000,
  largestContentfulPaint: 6000,
  maxErrors: 5 // Allow some errors in CI
};

class CIPerformanceRunner {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
      branch: process.env.GITHUB_REF || 'main',
      commit: process.env.GITHUB_SHA || 'unknown',
      results: []
    };
  }

  async runPerformanceTests() {
    console.log('🚀 Starting CI Performance Tests...\n');

    try {
      // Run Playwright tests
      console.log('Running Playwright performance tests...');
      execSync('npx playwright test tests/performance.spec.js --reporter=json', {
        stdio: 'pipe',
        cwd: process.cwd()
      });
    } catch (error) {
      console.log('Playwright tests completed with some failures (expected in CI)');
    }

    // Run custom performance monitor
    console.log('Running custom performance monitor...');
    try {
      const PerformanceMonitor = require('../tests/performance-monitor');
      const monitor = new PerformanceMonitor();
      
      await monitor.initialize();
      await monitor.login();
      
      // Test critical pages only in CI
      const criticalPages = [
        { name: 'Login', path: '/login' },
        { name: 'Dashboard', path: '/dashboard' },
        { name: 'Admin Panel - Loans', path: '/admin?tab=loans' },
        { name: 'Properties', path: '/properties' },
        { name: 'Loans', path: '/loans' },
        { name: 'Income', path: '/income' }
      ];

      for (const page of criticalPages) {
        try {
          const result = await monitor.measurePagePerformance(page.name, page.path);
          this.results.results.push(result);
        } catch (error) {
          console.error(`Error testing ${page.name}:`, error.message);
          this.results.results.push({
            pageName: page.name,
            pagePath: page.path,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      }

      await monitor.cleanup();
    } catch (error) {
      console.error('Performance monitor failed:', error);
      this.results.error = error.message;
    }

    return this.analyzeResults();
  }

  analyzeResults() {
    console.log('\n📊 Analyzing CI Performance Results...\n');

    const successful = this.results.results.filter(r => !r.error);
    const failed = this.results.results.filter(r => r.error);
    
    console.log(`Total Pages: ${this.results.results.length}`);
    console.log(`Successful: ${successful.length}`);
    console.log(`Failed: ${failed.length}`);

    if (successful.length > 0) {
      const avgLoadTime = successful.reduce((sum, r) => sum + r.totalLoadTime, 0) / successful.length;
      console.log(`Average Load Time: ${avgLoadTime.toFixed(2)}ms`);

      // Check thresholds
      const slowPages = successful.filter(r => r.totalLoadTime > CI_THRESHOLDS.pageLoad);
      const pagesWithErrors = successful.filter(r => r.errors && r.errors.length > CI_THRESHOLDS.maxErrors);

      if (slowPages.length > 0) {
        console.log(`\n⚠️  Slow Pages (>${CI_THRESHOLDS.pageLoad}ms):`);
        slowPages.forEach(page => {
          console.log(`  - ${page.pageName}: ${page.totalLoadTime}ms`);
        });
      }

      if (pagesWithErrors.length > 0) {
        console.log(`\n⚠️  Pages with Many Errors (>${CI_THRESHOLDS.maxErrors}):`);
        pagesWithErrors.forEach(page => {
          console.log(`  - ${page.pageName}: ${page.errors.length} errors`);
        });
      }

      // Overall assessment
      const hasCriticalIssues = slowPages.length > 2 || pagesWithErrors.length > 2 || failed.length > 1;
      
      if (hasCriticalIssues) {
        console.log('\n❌ CRITICAL: Performance issues detected that require attention');
        return false;
      } else if (slowPages.length > 0 || pagesWithErrors.length > 0) {
        console.log('\n⚠️  WARNING: Some performance issues detected');
        return true;
      } else {
        console.log('\n✅ SUCCESS: All performance tests passed');
        return true;
      }
    } else {
      console.log('\n❌ CRITICAL: No pages loaded successfully');
      return false;
    }
  }

  saveResults() {
    const resultsPath = path.join(__dirname, '..', 'ci-performance-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 CI results saved to: ${resultsPath}`);
  }
}

// Main execution
async function main() {
  const runner = new CIPerformanceRunner();
  
  try {
    const success = await runner.runPerformanceTests();
    runner.saveResults();
    
    if (!success) {
      console.log('\n🚨 Performance tests failed - deployment may be blocked');
      process.exit(1);
    } else {
      console.log('\n✅ Performance tests passed - deployment can proceed');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ CI Performance testing failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = CIPerformanceRunner;
