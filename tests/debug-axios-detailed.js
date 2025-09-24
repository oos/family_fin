const { chromium } = require('playwright');

async function debugAxiosDetailed() {
  console.log('🔍 Detailed Axios Debugging...\n');
  
  const browser = await chromium.launch({ 
    headless: false, 
    slowMo: 1000,
    devtools: true
  });
  
  const page = await browser.newPage();
  
  // Listen to all network requests
  page.on('request', request => {
    if (request.url().includes('auth/login')) {
      console.log(`🌐 Login Request: ${request.method()} ${request.url()}`);
      console.log(`🌐 Headers:`, request.headers());
    }
  });
  
  // Listen to console logs
  page.on('console', msg => {
    if (msg.text().includes('axios') || msg.text().includes('baseURL') || msg.text().includes('API')) {
      console.log(`📝 Console ${msg.type()}: ${msg.text()}`);
    }
  });
  
  try {
    // Go to login page
    console.log('🔐 Going to login page...');
    await page.goto('https://family-finance-frontend.onrender.com/login');
    await page.waitForLoadState('networkidle');
    
    // Inject debugging code to check axios configuration
    await page.evaluate(() => {
      console.log('=== AXIOS DEBUG INFO ===');
      console.log('window.axios exists:', typeof window.axios !== 'undefined');
      if (window.axios) {
        console.log('axios.defaults.baseURL:', window.axios.defaults?.baseURL);
        console.log('axios.defaults.timeout:', window.axios.defaults?.timeout);
        console.log('axios.defaults.headers:', window.axios.defaults?.headers);
      }
      
      // Check if process.env is available
      console.log('process.env available:', typeof process !== 'undefined');
      if (typeof process !== 'undefined') {
        console.log('REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
      }
      
      // Check if we can access the environment variable through window
      console.log('window.REACT_APP_API_URL:', window.REACT_APP_API_URL);
      
      // Try to make a test request to see what URL it uses
      if (window.axios) {
        console.log('Making test request...');
        window.axios.get('/test').catch(err => {
          console.log('Test request failed - URL used:', err.config?.url);
          console.log('Base URL from config:', err.config?.baseURL);
        });
      }
    });
    
    await page.waitForTimeout(2000);
    
    // Now try to login and see what URL it uses
    console.log('📝 Filling in credentials...');
    await page.fill('input[type="email"]', 'omarosullivan@gmail.com');
    await page.fill('input[type="password"]', 'admin123');
    
    console.log('🚀 Submitting login form...');
    await page.click('button[type="submit"]');
    
    // Wait for the request to complete
    await page.waitForTimeout(5000);
    
    const currentUrl = page.url();
    console.log(`📍 Final URL: ${currentUrl}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

debugAxiosDetailed();
