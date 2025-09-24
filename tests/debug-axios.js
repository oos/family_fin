const { chromium } = require('playwright');

async function debugAxios() {
  console.log('🔍 Debugging Axios Configuration...\n');
  
  const browser = await chromium.launch({ 
    headless: false, 
    slowMo: 1000,
    devtools: true
  });
  
  const page = await browser.newPage();
  
  try {
    // Navigate to login
    console.log('🔐 Navigating to login...');
    await page.goto('https://family-finance-frontend.onrender.com/login');
    
    // Wait for login form
    await page.waitForSelector('input[type="email"]');
    
    // Fill credentials
    await page.fill('input[type="email"]', 'omarosullivan@gmail.com');
    await page.fill('input[type="password"]', 'admin123');
    
    // Inject debugging code to monitor axios
    await page.evaluate(() => {
      // Override console.log to capture axios logs
      const originalLog = console.log;
      const originalError = console.error;
      
      console.log = (...args) => {
        if (args[0] && args[0].includes && args[0].includes('axios')) {
          originalLog('🔍 AXIOS LOG:', ...args);
        }
        originalLog(...args);
      };
      
      console.error = (...args) => {
        if (args[0] && args[0].includes && args[0].includes('axios')) {
          originalError('🔍 AXIOS ERROR:', ...args);
        }
        originalError(...args);
      };
      
      // Monitor fetch requests
      const originalFetch = window.fetch;
      window.fetch = function(...args) {
        console.log('🔍 FETCH REQUEST:', args[0], args[1]);
        return originalFetch.apply(this, args)
          .then(response => {
            console.log('🔍 FETCH RESPONSE:', response.status, response.url);
            return response;
          })
          .catch(error => {
            console.log('🔍 FETCH ERROR:', error);
            throw error;
          });
      };
    });
    
    // Monitor console logs
    page.on('console', msg => {
      if (msg.text().includes('🔍')) {
        console.log(msg.text());
      }
    });
    
    // Click login
    console.log('🔑 Clicking login button...');
    await page.click('button[type="submit"]');
    
    // Wait for the API call to complete
    await page.waitForTimeout(5000);
    
    // Check if there are any JavaScript errors
    console.log('\n📝 JavaScript Errors:');
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`  ERROR: ${msg.text()}`);
      }
    });
    
    // Wait a bit more to catch any errors
    await page.waitForTimeout(3000);
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await browser.close();
  }
}

debugAxios();
