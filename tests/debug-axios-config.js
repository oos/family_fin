const { chromium } = require('playwright');

async function debugAxiosConfig() {
  console.log('🔍 Debugging Axios Configuration...\n');
  
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
  
  try {
    // Go to login page
    console.log('🔐 Going to login page...');
    await page.goto('https://family-finance-frontend.onrender.com/login');
    await page.waitForLoadState('networkidle');
    
    // Check axios configuration
    const axiosConfig = await page.evaluate(() => {
      return {
        baseURL: window.axios?.defaults?.baseURL || 'Not set',
        timeout: window.axios?.defaults?.timeout || 'Not set',
        headers: window.axios?.defaults?.headers || 'Not set'
      };
    });
    console.log(`📊 Axios Configuration:`, axiosConfig);
    
    // Check environment variables
    const envVars = await page.evaluate(() => {
      return {
        REACT_APP_API_URL: process.env.REACT_APP_API_URL || 'Not set',
        NODE_ENV: process.env.NODE_ENV || 'Not set'
      };
    });
    console.log(`🌍 Environment Variables:`, envVars);
    
    // Check if axios is available
    const axiosAvailable = await page.evaluate(() => {
      return typeof window.axios !== 'undefined';
    });
    console.log(`📦 Axios Available: ${axiosAvailable}`);
    
    // Try to make a simple API call to see what URL it uses
    console.log('🔍 Testing API call...');
    await page.evaluate(() => {
      if (window.axios) {
        console.log('Making test API call...');
        window.axios.get('/test').catch(err => {
          console.log('Test API call failed:', err.message);
          console.log('Request URL:', err.config?.url);
          console.log('Base URL:', err.config?.baseURL);
        });
      }
    });
    
    await page.waitForTimeout(3000);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

debugAxiosConfig();
