const { chromium } = require('playwright');

async function manualButtonTest() {
  console.log('🔍 Manual Button Testing (Working Around Auth Issues)...\n');
  
  const browser = await chromium.launch({ 
    headless: false, 
    slowMo: 1000,
    devtools: true
  });
  
  const page = await browser.newPage();
  
  // Listen to console logs
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`❌ Console Error: ${msg.text()}`);
    }
  });
  
  try {
    // Go to the main page
    console.log('🔐 Going to main page...');
    await page.goto('https://family-finance-frontend.onrender.com/');
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);
    
    if (currentUrl.includes('/login')) {
      console.log('⚠️ Redirected to login page - authentication required');
      console.log('📝 Testing login page buttons...');
      
      // Test login page buttons
      const loginButtons = await page.locator('button, input[type="submit"]').all();
      console.log(`📊 Found ${loginButtons.length} buttons on login page`);
      
      for (let i = 0; i < loginButtons.length; i++) {
        try {
          const button = loginButtons[i];
          const isVisible = await button.isVisible();
          const isEnabled = await button.isEnabled();
          const text = await button.textContent();
          
          if (isVisible && isEnabled && text && text.trim()) {
            console.log(`  🔘 Button ${i + 1}: "${text.trim()}"`);
            
            // Test button click
            try {
              await button.click();
              await page.waitForTimeout(1000);
              console.log(`    ✅ Button clicked successfully`);
            } catch (clickError) {
              console.log(`    ❌ Button click failed: ${clickError.message}`);
            }
          }
        } catch (buttonError) {
          console.log(`  ❌ Error testing button ${i + 1}: ${buttonError.message}`);
        }
      }
      
      // Test form submission
      console.log('📝 Testing form submission...');
      try {
        await page.fill('input[type="email"]', 'omarosullivan@gmail.com');
        await page.fill('input[type="password"]', 'admin123');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(3000);
        
        const newUrl = page.url();
        console.log(`📍 URL after form submission: ${newUrl}`);
        
        if (newUrl.includes('/login')) {
          console.log('❌ Still on login page - form submission failed');
        } else {
          console.log('✅ Form submission successful - redirected');
        }
      } catch (formError) {
        console.log(`❌ Form submission error: ${formError.message}`);
      }
      
    } else {
      console.log('✅ Already authenticated - testing dashboard buttons...');
      
      // Test dashboard buttons
      const dashboardButtons = await page.locator('button, a[role="button"], [onclick]').all();
      console.log(`📊 Found ${dashboardButtons.length} clickable elements on dashboard`);
      
      for (let i = 0; i < Math.min(dashboardButtons.length, 10); i++) {
        try {
          const button = dashboardButtons[i];
          const isVisible = await button.isVisible();
          const isEnabled = await button.isEnabled();
          const text = await button.textContent();
          
          if (isVisible && isEnabled && text && text.trim()) {
            console.log(`  🔘 Button ${i + 1}: "${text.trim()}"`);
            
            // Test button click
            try {
              const urlBefore = page.url();
              await button.click();
              await page.waitForTimeout(2000);
              const urlAfter = page.url();
              
              if (urlBefore !== urlAfter) {
                console.log(`    ✅ Button clicked - navigated to: ${urlAfter}`);
              } else {
                console.log(`    ✅ Button clicked - no navigation`);
              }
            } catch (clickError) {
              console.log(`    ❌ Button click failed: ${clickError.message}`);
            }
          }
        } catch (buttonError) {
          console.log(`  ❌ Error testing button ${i + 1}: ${buttonError.message}`);
        }
      }
    }
    
    // Test navigation to different pages
    console.log('\n📚 Testing page navigation...');
    const pagesToTest = [
      { name: 'Admin Panel', url: '/admin' },
      { name: 'Income', url: '/income' },
      { name: 'Properties', url: '/properties' },
      { name: 'Loans', url: '/loans' },
      { name: 'Business Accounts', url: '/business-accounts' },
      { name: 'Transactions', url: '/transactions' },
      { name: 'GL Transactions', url: '/gl-transactions' },
      { name: 'Taxation', url: '/taxation' },
      { name: 'Pension', url: '/pension' }
    ];
    
    for (const pageInfo of pagesToTest) {
      try {
        console.log(`  🔗 Testing ${pageInfo.name}...`);
        await page.goto(`https://family-finance-frontend.onrender.com${pageInfo.url}`);
        await page.waitForTimeout(2000);
        
        const finalUrl = page.url();
        if (finalUrl.includes('/login')) {
          console.log(`    ❌ ${pageInfo.name} - redirected to login (auth required)`);
        } else if (finalUrl.includes(pageInfo.url)) {
          console.log(`    ✅ ${pageInfo.name} - page loaded successfully`);
          
          // Test buttons on this page
          const pageButtons = await page.locator('button, input[type="submit"], a[role="button"]').all();
          console.log(`      📊 Found ${pageButtons.length} buttons on ${pageInfo.name}`);
          
          // Test first few buttons
          for (let i = 0; i < Math.min(pageButtons.length, 3); i++) {
            try {
              const button = pageButtons[i];
              const isVisible = await button.isVisible();
              const isEnabled = await button.isEnabled();
              const text = await button.textContent();
              
              if (isVisible && isEnabled && text && text.trim()) {
                console.log(`        🔘 Testing button: "${text.trim()}"`);
                try {
                  await button.click();
                  await page.waitForTimeout(1000);
                  console.log(`          ✅ Button clicked successfully`);
                } catch (clickError) {
                  console.log(`          ❌ Button click failed: ${clickError.message}`);
                }
              }
            } catch (buttonError) {
              console.log(`        ❌ Error testing button: ${buttonError.message}`);
            }
          }
        } else {
          console.log(`    ❓ ${pageInfo.name} - unexpected redirect to: ${finalUrl}`);
        }
      } catch (pageError) {
        console.log(`    ❌ Error testing ${pageInfo.name}: ${pageError.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

manualButtonTest();
