const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { decryptPassword } = require('../utils/encryption');

// Use stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

class MITSIMSScraper {
  constructor() {
    this.browser = null;
    this.page = null;
    this.baseUrl = process.env.MITS_IMS_URL || 'http://mitsims.in';
  }

  /**
   * Initialize browser and page
   */
  async initialize() {
    try {
      // Set headless based on environment variable for debugging
      const isHeadless = process.env.HEADLESS_MODE !== 'false';
      
      this.browser = await puppeteer.launch({
        headless: isHeadless ? 'new' : false,
        slowMo: 100, // Slow down by 100ms for visibility
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1366,768'
        ]
      });
      
      this.page = await this.browser.newPage();
      await this.page.setViewport({ width: 1366, height: 768 });
      
      // Block app downloads and unnecessary resources
      await this.page.setRequestInterception(true);
      this.page.on('request', (request) => {
        const url = request.url();
        const resourceType = request.resourceType();
        
        // Block app download URLs and app update checks
        if (url.includes('getAppUpdate') || 
            url.includes('.apk') || 
            url.includes('app-release') ||
            url.includes('download')) {
          console.log('🚫 Blocked app download/update request:', url);
          request.abort();
        }
        // Block unnecessary resources to speed up page load
        else if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
          request.abort();
        } else {
          request.continue();
        }
      });
      
      // Listen for network responses to catch login API calls
      this.page.on('response', async (response) => {
        const url = response.url();
        // Log login-related API calls
        if (url.includes('login') || url.includes('auth') || url.includes('signin') || 
            url.includes('validate') || url.includes('checkLogin')) {
          console.log(`📡 Login API: ${response.status()} ${url}`);
          try {
            const contentType = response.headers()['content-type'] || '';
            if (contentType.includes('application/json')) {
              const data = await response.json();
              console.log('   Response:', JSON.stringify(data).substring(0, 200));
            }
          } catch (e) {
            // Ignore if we can't read the response
          }
        }
      });
      
      // Set timeout - increase for slow connections
      this.page.setDefaultTimeout(60000); // 60 seconds (reduced from 90)
      
      // Add console log listener to see page errors (but filter out common timeout errors)
      this.page.on('console', msg => {
        const text = msg.text();
        if (msg.type() === 'error') {
          // Filter out resource loading timeout errors (they're harmless)
          if (!text.includes('ERR_CONNECTION_TIMED_OUT') && 
              !text.includes('Failed to load resource')) {
            console.log('Browser console error:', text);
          }
        }
      });
      
      // Add error listener
      this.page.on('error', err => {
        console.error('Page error:', err);
      });
      
      // Add request failed listener to track what's timing out
      this.page.on('requestfailed', request => {
        const url = request.url();
        const failure = request.failure();
        // Only log if it's not an intentionally aborted request
        if (failure && !failure.errorText.includes('net::ERR_ABORTED')) {
          console.log(`⚠️ Request failed: ${failure.errorText} - ${url.substring(0, 100)}`);
        }
      });
      
      return true;
    } catch (error) {
      console.error('Error initializing browser:', error);
      throw error;
    }
  }

  /**
   * Helper: Try multiple selectors and return the first one that exists
   */
  async waitForAnySelector(selectors, timeout = 10000) {
    console.log(`   Trying ${selectors.length} selectors...`);
    
    for (const selector of selectors) {
      try {
        // Skip :has-text selectors as they're not standard CSS
        if (selector.includes(':has-text')) {
          continue;
        }
        
        await this.page.waitForSelector(selector, { timeout: 2000 });
        console.log(`   ✅ Found: ${selector}`);
        return selector;
      } catch (e) {
        // Continue to next selector
      }
    }
    
    // If no CSS selector worked, try XPath for text-based searches
    for (const selector of selectors) {
      if (selector.includes(':has-text')) {
        try {
          const text = selector.match(/\("(.+)"\)/)?.[1] || selector.match(/:has-text\((.+)\)/)?.[1];
          if (text) {
            const xpath = `//*[contains(text(), "${text}")]`;
            const elements = await this.page.$x(xpath);
            if (elements.length > 0) {
              console.log(`   ✅ Found via XPath: ${text}`);
              // Return a special marker for XPath
              return `xpath:${xpath}`;
            }
          }
        } catch (e) {
          // Continue
        }
      }
    }
    
    console.log('   ❌ None of the selectors found');
    return null;
  }

  /**
   * Login to MITS IMS
   */
  async login(studentId, encryptedPassword) {
    try {
      const password = decryptPassword(encryptedPassword);
      
      console.log(`Attempting login for student: ${studentId}`);
      console.log(`Navigating to: ${this.baseUrl}`);
      
      // Navigate to login page with timeout handling
      try {
        await this.page.goto(this.baseUrl, { 
          waitUntil: 'domcontentloaded', // Changed from networkidle2 to be faster
          timeout: 30000 // 30 second timeout
        });
        console.log('✅ Page loaded');
      } catch (navError) {
        console.log('⚠️ Navigation timeout, but page might be loaded. Continuing...');
        // Don't throw, continue if page is at least partially loaded
        if (navError.message.includes('Timeout') || navError.message.includes('Navigation')) {
          console.log('   Page URL:', this.page.url());
        } else {
          throw navError; // Re-throw if it's a different error
        }
      }
      
      // Take screenshot before login
      await this.takeScreenshot(`screenshots/01-login-page-${studentId}.png`);
      
      // CRITICAL: MITS has Staff/Student/Parent tabs - we MUST click Student first!
      console.log('⏳ Looking for Student tab...');
      
      // Wait for page to fully load
      await this.page.waitForTimeout(2000);
      
      // First, let's see what tabs are available
      const availableTabs = await this.page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        return links.map(link => ({
          text: link.textContent.trim(),
          href: link.href,
          visible: link.offsetParent !== null
        })).filter(l => l.text && l.visible);
      });
      console.log('   Available tabs/links:', availableTabs.filter(t => 
        t.text.toLowerCase().includes('student') || 
        t.text.toLowerCase().includes('staff') || 
        t.text.toLowerCase().includes('parent')
      ));
      
      // Try to find and click Student tab using multiple methods
      let studentTabClicked = false;
      
      // Method 1: Look for a button or div with "Student" text (not an app link)
      try {
        const clicked = await this.page.evaluate(() => {
          // Find all clickable elements with "Student" text
          const elements = Array.from(document.querySelectorAll('button, div[onclick], span[onclick], a'));
          const studentElement = elements.find(el => {
            const text = el.textContent.toLowerCase();
            const href = el.href || '';
            // Must contain "student" but NOT be an app download link
            return text.includes('student') && 
                   !href.includes('getAppUpdate') && 
                   !href.includes('.apk');
          });
          
          if (studentElement) {
            console.log('Found student element:', studentElement.textContent, studentElement.href || 'no href');
            studentElement.click();
            return true;
          }
          return false;
        });
        
        if (clicked) {
          await this.page.waitForTimeout(1000);
          studentTabClicked = true;
          console.log('   ✅ Clicked Student tab (Method 1 - Safe click)');
        }
      } catch (e) {
        console.log('   ❌ Method 1 failed:', e.message);
      }
      
      // Method 2: Try clicking by text "Student" using XPath (avoiding app links)
      if (!studentTabClicked) {
        try {
          const studentXPath = "//a[contains(text(), 'Student') and not(contains(@href, 'getAppUpdate'))]";
          const studentElements = await this.page.$x(studentXPath);
          if (studentElements.length > 0) {
            console.log('   Method 2: Found Student tab by text (non-app link)');
            await this.page.evaluate((el) => el.click(), studentElements[0]);
            await this.page.waitForTimeout(1000);
            studentTabClicked = true;
            console.log('   ✅ Clicked Student tab (Method 2)');
          }
        } catch (e) {
          console.log('   ❌ Method 2 failed:', e.message);
        }
      }
      
      // Method 3: Try finding tab buttons (some sites use buttons, not links)
      if (!studentTabClicked) {
        try {
          const clicked = await this.page.evaluate(() => {
            // Look for tab-like buttons or divs
            const tabs = Array.from(document.querySelectorAll('button, [role="tab"], .tab, .nav-link, [onclick]'));
            const studentTab = tabs.find(tab => 
              tab.textContent.toLowerCase().includes('student')
            );
            if (studentTab) {
              studentTab.click();
              return true;
            }
            return false;
          });
          if (clicked) {
            await this.page.waitForTimeout(1000);
            studentTabClicked = true;
            console.log('   ✅ Clicked Student tab (Method 3 - Tab button)');
          }
        } catch (e) {
          console.log('   ❌ Method 3 failed:', e.message);
        }
      }
      
      if (!studentTabClicked) {
        throw new Error('Failed to click Student tab! Cannot proceed with Staff form.');
      }
      
      // CRITICAL: Wait for the STUDENT form to actually load (AJAX/JavaScript takes time)
      console.log('⏳ Waiting for STUDENT form to load (checking for "Register No" field)...');
      
      // Try up to 10 times (10 seconds) to find the Register No field
      let foundStudentForm = false;
      for (let i = 0; i < 10; i++) {
        const registerNoField = await this.page.$('input[placeholder*="Register No" i], input[placeholder*="Register Number" i]');
        if (registerNoField) {
          console.log('✅ STUDENT form loaded - found Register No field!');
          foundStudentForm = true;
          break;
        }
        console.log(`   Attempt ${i + 1}/10: Register No field not found yet, waiting...`);
        await this.page.waitForTimeout(1000);
      }
      
      if (!foundStudentForm) {
        await this.takeScreenshot(`screenshots/ERROR-no-student-form-${studentId}.png`);
        throw new Error('Student form did not load! Still showing Staff/Parent form. Check screenshot.');
      }
      
      await this.takeScreenshot(`screenshots/01b-student-form-ready-${studentId}.png`);
      
      // Now find the Register No input field
      console.log('⏳ Finding Register No input field...');
      const usernameSelector = await this.waitForAnySelector([
        // MITS GEMS specific - STUDENT Register No field (MUST match these first!)
        'input[placeholder*="Register No" i]',
        'input[placeholder*="Register Number" i]',
        'input[placeholder*="Reg No" i]',
        'input[name="registerNo"]',
        'input[id="registerNo"]',
        'input[name="regno"]',
        'input[id="regno"]',
        'input[name="regNo"]',
        'input[id="regNo"]'
      ]);
      
      if (!usernameSelector) {
        throw new Error('Could not find username input field. Website structure may have changed.');
      }
      console.log(`✅ Found username field: ${usernameSelector}`);
      
      // Fill login credentials
      console.log('⏳ Entering Register Number...');
      
      // Set the register number value using JavaScript (more reliable)
      await this.page.evaluate((selector, regNo) => {
        const input = document.querySelector(selector);
        if (input) {
          input.value = regNo;
          // Trigger input events to notify the form
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, usernameSelector, studentId);
      
      // Verify Register Number was entered
      const regNoEntered = await this.page.evaluate((selector) => {
        const input = document.querySelector(selector);
        return input ? input.value : '';
      }, usernameSelector);
      
      console.log(`✅ Register Number entered: ${regNoEntered}`);
      
      // Wait a moment for any dynamic form changes
      await this.page.waitForTimeout(2000);
      
      // Now find the password field
      console.log('⏳ Looking for password field...');
      
      // Take a screenshot to see the current form state
      await this.takeScreenshot(`screenshots/01c-after-regno-${studentId}.png`);
      
      // Check if password field exists and is visible
      const passwordFieldInfo = await this.page.evaluate(() => {
        const pwdFields = Array.from(document.querySelectorAll('input[type="password"]'));
        return pwdFields.map(field => ({
          type: field.type,
          name: field.name,
          id: field.id,
          placeholder: field.placeholder,
          visible: field.offsetParent !== null,
          disabled: field.disabled,
          readonly: field.readOnly
        }));
      });
      console.log('   Password fields found:', JSON.stringify(passwordFieldInfo));
      
      // Find the VISIBLE password field (important: there are hidden fields for other tabs!)
      const visiblePasswordField = await this.page.evaluateHandle(() => {
        const pwdFields = Array.from(document.querySelectorAll('input[type="password"]'));
        const visibleField = pwdFields.find(field => field.offsetParent !== null);
        return visibleField;
      });
      
      if (!visiblePasswordField) {
        throw new Error('No visible password field found!');
      }
      
      console.log('✅ Found visible password field');
      
      // Try multiple methods to enter the password
      console.log('⏳ Attempting to enter password...');
      
      // Method 1: Focus and type directly on the element handle
      try {
        await visiblePasswordField.focus();
        await this.page.keyboard.type(password, { delay: 50 });
        console.log('   ✅ Password entered via keyboard typing');
      } catch (e) {
        console.log('   ❌ Keyboard typing failed:', e.message);
        
        // Method 2: Direct value assignment using evaluate
        await this.page.evaluate((field, pwd) => {
          field.value = pwd;
          field.dispatchEvent(new Event('input', { bubbles: true }));
          field.dispatchEvent(new Event('change', { bubbles: true }));
          field.dispatchEvent(new Event('blur', { bubbles: true }));
        }, visiblePasswordField, password);
        console.log('   ✅ Password set via JavaScript');
      }
      
      // Verify password was entered
      const passwordEntered = await this.page.evaluate((field) => {
        return field.value.length > 0;
      }, visiblePasswordField);
      
      if (!passwordEntered) {
        throw new Error('Password field is still empty after attempting to fill it!');
      }
      
      console.log('✅ Password entered and verified');
      
      // Small wait to ensure form is ready
      await this.page.waitForTimeout(500);
      
      // Take screenshot before clicking login
      await this.takeScreenshot(`screenshots/02-before-login-${studentId}.png`);
      
      // Check for any hidden required fields that might need values
      console.log('⏳ Checking for hidden required fields...');
      const filledHiddenFields = await this.page.evaluate((regNo) => {
        // Find ALL userId fields (hidden and visible) and fill them
        const userIdFields = document.querySelectorAll('input[name="userId"]');
        let userIdCount = 0;
        
        userIdFields.forEach(field => {
          field.value = regNo;
          // Remove required attribute if it's hidden (can't be focused)
          if (field.offsetParent === null && field.hasAttribute('required')) {
            field.removeAttribute('required');
            console.log('Removed required from hidden userId field');
          }
          field.dispatchEvent(new Event('input', { bubbles: true }));
          field.dispatchEvent(new Event('change', { bubbles: true }));
          userIdCount++;
        });
        
        // Find all hidden password fields and copy from visible one
        const visiblePassword = Array.from(document.querySelectorAll('input[type="password"]'))
          .find(inp => inp.offsetParent !== null);
        let passwordsFilled = 0;
        if (visiblePassword && visiblePassword.value) {
          const hiddenPasswords = document.querySelectorAll('input[name="password"][type="password"]');
          hiddenPasswords.forEach(pwd => {
            if (pwd !== visiblePassword) {
              pwd.value = visiblePassword.value;
              // Remove required attribute if it's hidden
              if (pwd.offsetParent === null && pwd.hasAttribute('required')) {
                pwd.removeAttribute('required');
                console.log('Removed required from hidden password field');
              }
              pwd.dispatchEvent(new Event('input', { bubbles: true }));
              pwd.dispatchEvent(new Event('change', { bubbles: true }));
              passwordsFilled++;
            }
          });
        }
        
        return { userIdCount, passwordsFilled };
      }, studentId);
      
      console.log(`   Hidden fields filled: userId=${filledHiddenFields.userIdCount}, passwords=${filledHiddenFields.passwordsFilled}`);
      
      // Click login button
      console.log('⏳ Looking for LOGIN button (green button below password)...');
      
      // Try to find the visible login button
      const loginButtonInfo = await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"]'));
        return buttons.map(btn => ({
          text: btn.textContent.trim() || btn.value,
          type: btn.type,
          value: btn.value,
          visible: btn.offsetParent !== null,
          tagName: btn.tagName,
          className: btn.className
        })).filter(b => b.visible);
      });
      console.log('   Available buttons:', JSON.stringify(loginButtonInfo));
      
      // Find the Login button - it's typically an input[type="submit"] or button with "Login" text
      const loginButton = await this.page.evaluateHandle(() => {
        // Method 1: Look for visible button/input with "Login" text/value
        const allButtons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"]'));
        
        // Find visible login button
        const loginBtn = allButtons.find(btn => {
          const text = (btn.textContent || btn.value || '').toLowerCase();
          return text.includes('login') && btn.offsetParent !== null;
        });
        
        return loginBtn;
      });
      
      if (!loginButton || !loginButton.asElement()) {
        throw new Error('Could not find login button (green button).');
      }
      
      console.log(`✅ Found login button`);
      
      // Click the login button and wait for navigation
      console.log('⏳ Clicking green LOGIN button...');
      
      try {
        // Click the button and wait for navigation
        await Promise.all([
          this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }),
          loginButton.click()
        ]);
        console.log('✅ Login button clicked - navigation detected');
      } catch (navError) {
        // Navigation might timeout if it's a same-page update or AJAX
        console.log('⚠️ Navigation timeout:', navError.message);
        console.log('   Waiting additional 5 seconds for page to update...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
      // Take screenshot after login
      try {
        await this.takeScreenshot(`screenshots/03-after-login-${studentId}.png`);
      } catch (screenshotError) {
        console.log('Could not take post-login screenshot:', screenshotError.message);
      }
      
      // Check if login was successful
      let currentUrl;
      try {
        currentUrl = this.page.url();
        console.log(`Current URL: ${currentUrl}`);
      } catch (urlError) {
        // Page might have navigated, wait and try again
        await new Promise(resolve => setTimeout(resolve, 3000));
        currentUrl = this.page.url();
        console.log(`Current URL (retry): ${currentUrl}`);
      }
      
      // Debug: Check what's on the page now
      const pageInfo = await this.page.evaluate(() => {
        // Helper function to check if any link contains text
        const hasLinkWithText = (text) => {
          return Array.from(document.querySelectorAll('a'))
            .some(a => a.textContent.includes(text));
        };
        
        return {
          title: document.title,
          url: window.location.href,
          // Check if still on login page
          hasLoginForm: !!document.querySelector('input[type="password"]'),
          hasRegisterField: !!document.querySelector('input[placeholder*="Register" i]'),
          // Check for dashboard elements - MITS specific
          hasDashboardLink: hasLinkWithText('Dashboard'),
          hasAttendanceLink: hasLinkWithText('Attendance'),
          hasLogoutLink: hasLinkWithText('LOGOUT'),
          hasChangePassword: hasLinkWithText('Change Password'),
          // Get visible navigation links
          navLinks: Array.from(document.querySelectorAll('a'))
            .filter(a => a.offsetParent !== null)
            .map(a => a.textContent.trim())
            .filter(text => text && text.length < 50)
            .slice(0, 20)
        };
      });
      
      console.log('📊 Page Info After Login Attempt:');
      console.log('   Title:', pageInfo.title);
      console.log('   URL:', pageInfo.url);
      console.log('   Has Login Form:', pageInfo.hasLoginForm);
      console.log('   Has Dashboard Link:', pageInfo.hasDashboardLink);
      console.log('   Has Attendance Link:', pageInfo.hasAttendanceLink);
      console.log('   Has LOGOUT Link:', pageInfo.hasLogoutLink);
      console.log('   Has Change Password:', pageInfo.hasChangePassword);
      console.log('   Navigation Links:', pageInfo.navLinks.join(', '));
      
      // Check if login was successful FIRST - MITS shows Dashboard, Attendance, LOGOUT links
      // SUCCESS if we have LOGOUT link OR we're on studentIndex.html
      if (pageInfo.hasLogoutLink || pageInfo.hasChangePassword) {
        console.log('✅ Login successful - Found user navigation (LOGOUT/Change Password)');
        return true;
      } else if (currentUrl.includes('studentIndex.html')) {
        console.log('✅ Login successful - On studentIndex.html page');
        return true;
      } else if (pageInfo.hasDashboardLink || pageInfo.hasAttendanceLink) {
        console.log('✅ Login successful - Found dashboard navigation');
        return true;
      } else if (pageInfo.hasLoginForm || pageInfo.hasRegisterField) {
        // Still on login page - login failed
        await this.takeScreenshot(`screenshots/error-still-on-login-${studentId}.png`);
        
        // Check for error messages on login page
        const errorElement = await this.page.$('.error, .alert-danger, .login-error, .text-danger:not(:empty)');
        let errorText = '';
        if (errorElement) {
          errorText = await this.page.evaluate(el => el.textContent.trim(), errorElement);
          if (errorText) {
            console.log('🚨 Login error message found:', errorText);
          }
        }
        
        // Try to get more specific error info
        const formDebugInfo = await this.page.evaluate(() => {
          const form = document.querySelector('form');
          const regField = document.querySelector('input[placeholder*="Register" i]');
          const pwdField = Array.from(document.querySelectorAll('input[type="password"]'))
            .find(f => f.offsetParent !== null);
          
          return {
            formAction: form?.action || 'no form action',
            formMethod: form?.method || 'no form method',
            regFieldValue: regField?.value || 'empty',
            pwdFieldValue: pwdField?.value ? '***filled***' : 'empty',
            formValid: form?.checkValidity() || false,
            requiredFields: Array.from(document.querySelectorAll('input[required]'))
              .map(f => ({ name: f.name, value: f.value, filled: !!f.value }))
          };
        });
        
        console.log('🔍 Form Debug Info:');
        console.log(JSON.stringify(formDebugInfo, null, 2));
        
        const errorMessage = errorText || 'still on login page';
        throw new Error(`Login failed - ${errorMessage}. Form was filled (Register: ${formDebugInfo.regFieldValue}, Password: ${formDebugInfo.pwdFieldValue}) but did not redirect. Check credentials or website changes.`);
      }
      
      // Assume success if we got redirected somewhere else
      console.log('✅ Login successful - URL changed to:', currentUrl);
      return true;
      
    } catch (error) {
      console.error('Login error:', error.message);
      throw error;
    }
  }

  /**
   * Navigate to attendance page and extract data
   */
  async getAttendance() {
    try {
      console.log('📊 Getting attendance data from studentIndex.html...');
      
      // Verify we're on the correct page
      const currentUrl = this.page.url();
      console.log(`Current URL: ${currentUrl}`);
      
      if (!currentUrl.includes('studentIndex.html')) {
        console.log('⚠️ Warning: Not on studentIndex.html page');
        console.log('   Attempting to navigate or find attendance anyway...');
      } else {
        console.log('✅ On correct page: studentIndex.html');
      }
      
      // Take screenshot of current page (should be dashboard with attendance)
      await this.takeScreenshot('screenshots/04-dashboard.png');
      
      // Wait a bit for dashboard to fully load
      console.log('⏳ Waiting for page to fully load...');
      await this.page.waitForTimeout(3000);
      
      // ===== READ ENTIRE PAGE CONTENT FIRST =====
      console.log('\n' + '='.repeat(80));
      console.log('📖 READING ENTIRE PAGE CONTENT FROM studentIndex.html');
      console.log('='.repeat(80));
      
      const pageContent = await this.page.evaluate(() => {
        return {
          // Page metadata
          title: document.title,
          url: window.location.href,
          
          // Full HTML content
          fullHTML: document.documentElement.outerHTML,
          
          // Body text content
          bodyText: document.body ? document.body.innerText : '',
          
          // All visible text
          visibleText: document.body ? document.body.textContent.trim() : '',
          
          // All tables on the page
          tables: Array.from(document.querySelectorAll('table')).map((table, index) => ({
            index: index,
            rows: table.rows.length,
            columns: table.rows[0] ? table.rows[0].cells.length : 0,
            headers: Array.from(table.querySelectorAll('th')).map(th => th.textContent.trim()),
            innerHTML: table.innerHTML,
            outerHTML: table.outerHTML
          })),
          
          // All links
          links: Array.from(document.querySelectorAll('a')).map(a => ({
            text: a.textContent.trim(),
            href: a.href,
            visible: a.offsetParent !== null
          })),
          
          // All forms
          forms: Array.from(document.querySelectorAll('form')).map(form => ({
            action: form.action,
            method: form.method,
            id: form.id,
            name: form.name,
            inputs: Array.from(form.querySelectorAll('input, select, textarea')).map(input => ({
              type: input.type,
              name: input.name,
              id: input.id,
              value: input.value
            }))
          })),
          
          // All divs with IDs or classes
          divs: Array.from(document.querySelectorAll('div[id], div[class]')).map(div => ({
            id: div.id,
            className: div.className,
            text: div.textContent.trim().substring(0, 200) // First 200 chars
          })).slice(0, 50), // Limit to first 50 divs
          
          // All scripts (source only, not content)
          scripts: Array.from(document.querySelectorAll('script')).map(script => ({
            src: script.src,
            type: script.type
          })),
          
          // Page structure
          structure: {
            hasTables: !!document.querySelector('table'),
            hasNavigation: !!document.querySelector('nav'),
            hasHeader: !!document.querySelector('header'),
            hasFooter: !!document.querySelector('footer'),
            totalElements: document.getElementsByTagName('*').length
          }
        };
      });
      
      // Log the page content details
      console.log('\n📄 PAGE METADATA:');
      console.log(`   Title: ${pageContent.title}`);
      console.log(`   URL: ${pageContent.url}`);
      console.log(`   Total Elements: ${pageContent.structure.totalElements}`);
      console.log(`   Has Tables: ${pageContent.structure.hasTables}`);
      console.log(`   Has Navigation: ${pageContent.structure.hasNavigation}`);
      
      console.log('\n🔗 LINKS FOUND:');
      pageContent.links.filter(link => link.visible).slice(0, 20).forEach((link, i) => {
        console.log(`   ${i + 1}. ${link.text} → ${link.href}`);
      });
      
      console.log('\n📊 TABLES FOUND:');
      pageContent.tables.forEach((table, i) => {
        console.log(`   Table ${i + 1}:`);
        console.log(`      Rows: ${table.rows}, Columns: ${table.columns}`);
        console.log(`      Headers: ${table.headers.join(' | ')}`);
      });
      
      console.log('\n📝 FORMS FOUND:');
      pageContent.forms.forEach((form, i) => {
        console.log(`   Form ${i + 1}:`);
        console.log(`      Action: ${form.action}`);
        console.log(`      Method: ${form.method}`);
        console.log(`      Inputs: ${form.inputs.length}`);
      });
      
      console.log('\n📦 DIVS WITH IDs/Classes (first 20):');
      pageContent.divs.slice(0, 20).forEach((div, i) => {
        console.log(`   ${i + 1}. ID: ${div.id || 'none'}, Class: ${div.className || 'none'}`);
      });
      
      console.log('\n📜 SCRIPTS LOADED:');
      pageContent.scripts.filter(s => s.src).slice(0, 10).forEach((script, i) => {
        console.log(`   ${i + 1}. ${script.src}`);
      });
      
      console.log('\n📄 BODY TEXT (first 1000 characters):');
      console.log(pageContent.bodyText.substring(0, 1000));
      
      console.log('\n' + '='.repeat(80));
      console.log('✅ PAGE CONTENT READING COMPLETE');
      console.log('='.repeat(80) + '\n');
      
      // Log page title for verification
      const pageTitle = await this.page.title();
      console.log(`Page Title: ${pageTitle}`);
      
      // MITS shows attendance on the Dashboard page itself
      // Check if attendance table is already visible
      console.log('⏳ Checking if attendance table is visible...');
      let attendanceTableVisible = await this.page.evaluate(() => {
        const tables = document.querySelectorAll('table');
        for (const table of tables) {
          const text = table.textContent.toLowerCase();
          if (text.includes('subject code') && 
              text.includes('classes attended') &&
              text.includes('total conducted')) {
            return true;
          }
        }
        return false;
      });
      
      // If not visible, try to click on "Attendance" link
      if (!attendanceTableVisible) {
        console.log('⏳ Attendance not visible, looking for Attendance link...');
        
        // Try to find and click Attendance link/button
        const attendanceClicked = await this.page.evaluate(() => {
          // Look for Attendance link in navigation
          const links = Array.from(document.querySelectorAll('a, button, div[onclick]'));
          const attendanceLink = links.find(el => {
            const text = el.textContent.trim().toLowerCase();
            return text === 'attendance' || text.includes('attendance');
          });
          
          if (attendanceLink) {
            console.log('Found Attendance link, clicking...');
            attendanceLink.click();
            return true;
          }
          return false;
        });
        
        if (attendanceClicked) {
          console.log('✅ Clicked Attendance link');
          await this.page.waitForTimeout(3000);
          await this.takeScreenshot('screenshots/05-attendance-page.png');
        } else {
          console.log('⚠️ Could not find Attendance link - table might already be visible');
        }
      } else {
        console.log('✅ Attendance table already visible on dashboard');
      }
      
      // Wait for attendance table to be present
      console.log('⏳ Waiting for attendance table...');
      try {
        await this.page.waitForSelector('table', { timeout: 10000 });
        console.log('✅ Table found');
      } catch (e) {
        throw new Error('Attendance table not found on page after waiting');
      }
      
      // Take screenshot of attendance data
      await this.takeScreenshot('screenshots/06-attendance-data.png');
      
      // Extract attendance data using 6 different patterns (Browser Extension Technique)
      console.log('📊 Extracting attendance data using multi-pattern extraction...');
      const attendanceData = await this.page.evaluate(() => {
        const subjects = [];
        let totalClasses = 0;
        let totalAttended = 0;
        const debugInfo = {
          patternsUsed: [],
          tablesFound: 0,
          fieldsetsFound: 0,
          coloredSpansFound: 0
        };

        console.log('\n' + '='.repeat(80));
        console.log('🔍 MULTI-PATTERN EXTRACTION (6 Patterns)');
        console.log('='.repeat(80));

        // ============================================================
        // PATTERN 1: Traditional HTML Table (Primary Method)
        // ============================================================
        console.log('\n[Pattern 1] Traditional HTML Table...');
        const tables = document.querySelectorAll('table');
        debugInfo.tablesFound = tables.length;
        console.log(`   Found ${tables.length} table(s)`);
        
        let pattern1Success = false;
        tables.forEach((table, tableIndex) => {
          const text = table.textContent.toLowerCase();
          if (text.includes('subject code') && 
              text.includes('classes attended') &&
              text.includes('total conducted')) {
            console.log(`   ✅ Table ${tableIndex + 1} matches attendance pattern`);
            
            const rows = table.querySelectorAll('tr');
            rows.forEach((row, rowIndex) => {
              const cells = row.querySelectorAll('td, th');
              const cellTexts = Array.from(cells).map(c => c.textContent.trim());
              const cellTextLower = cellTexts.join(' ').toLowerCase();
              
              // DEBUG: Log all cell values for each row
              if (rowIndex <= 3) {
                console.log(`      DEBUG Row ${rowIndex}: [${cellTexts.join(' | ')}]`);
              }
              
              // Skip headers
              if (cellTextLower.includes('s.no') || 
                  cellTextLower.includes('subject code') || 
                  cellTextLower.includes('attendance')) {
                return;
              }
              
              if (cells.length >= 4) {
                const sno = cellTexts[0] || '';
                const subjectCode = cellTexts[1] || '';
                const attendedStr = cellTexts[2] || '0';
                const totalStr = cellTexts[3] || '0';
                const percentageStr = cellTexts[4] || '';
                
                // DEBUG: Show what we're extracting
                console.log(`      DEBUG Extracting: S.No=${sno}, Subject=${subjectCode}, Attended=${attendedStr}, Total=${totalStr}, %=${percentageStr}`);
                
                if (sno && !isNaN(parseInt(sno)) && subjectCode) {
                  const attended = parseInt(attendedStr) || 0;
                  const total = parseInt(totalStr) || 0;
                  let percentage = 0;
                  
                  if (percentageStr) {
                    const match = percentageStr.match(/(\d+\.?\d*)/);
                    if (match) percentage = parseFloat(match[1]);
                  }
                  if (percentage === 0 && total > 0) {
                    percentage = (attended / total * 100);
                  }
                  
                  if (total > 0 && percentage >= 0 && percentage <= 100) {
                    totalClasses += total;
                    totalAttended += attended;
                    subjects.push({
                      subjectName: subjectCode,
                      subjectCode: subjectCode,
                      totalClasses: total,
                      attendedClasses: attended,
                      percentage: percentage.toFixed(2),
                      extractionPattern: 'Pattern1-Table'
                    });
                    pattern1Success = true;
                    console.log(`      Row ${rowIndex}: ${subjectCode} - ${percentage.toFixed(2)}%`);
                  }
                }
              }
            });
          }
        });
        
        if (pattern1Success) {
          debugInfo.patternsUsed.push('Pattern 1: HTML Table');
          console.log(`   ✅ Pattern 1 Success: ${subjects.length} subjects found`);
        }

        // ============================================================
        // PATTERN 2: MITSIMS ExtJS semesterActivity Fieldset
        // ============================================================
        if (subjects.length === 0) {
          console.log('\n[Pattern 2] MITSIMS ExtJS semesterActivity...');
          const semesterActivity = document.getElementById('semesterActivity');
          
          if (semesterActivity) {
            const fieldsets = semesterActivity.querySelectorAll('fieldset.bottom-border');
            debugInfo.fieldsetsFound = fieldsets.length;
            console.log(`   Found ${fieldsets.length} fieldsets`);
            
            fieldsets.forEach((fieldset, index) => {
              const displayFields = fieldset.querySelectorAll('div[id^="displayfield-"]');
              
              if (displayFields.length >= 5) {
                let subjectCode = null;
                let attendedClasses = null;
                let subjectTotalClasses = null;
                let attendancePercent = null;
                
                displayFields.forEach((field, fieldIndex) => {
                  const span = field.querySelector('span');
                  if (!span) return;
                  const text = span.textContent.trim();
                  
                  // Field 1: Subject Code
                  if (fieldIndex === 1 && /^[A-Z0-9]{3,}$/i.test(text) && text !== 'SUBJECT') {
                    subjectCode = text;
                  }
                  
                  // Field 2: Classes Attended
                  if (fieldIndex === 2) {
                    const val = parseInt(text);
                    if (!isNaN(val)) attendedClasses = val;
                  }
                  
                  // Field 3: Total Conducted
                  if (fieldIndex === 3) {
                    const val = parseInt(text);
                    if (!isNaN(val)) subjectTotalClasses = val;
                  }
                  
                  // Field 4: Attendance % (colored)
                  if (fieldIndex === 4) {
                    const style = span.getAttribute('style') || '';
                    if (style.includes('color:')) {
                      const value = parseFloat(text);
                      if (!isNaN(value) && value >= 0 && value <= 100) {
                        attendancePercent = value;
                      }
                    }
                  }
                });
                
                if (subjectCode && subjectTotalClasses > 0 && attendancePercent !== null) {
                  const attended = attendedClasses || Math.round(subjectTotalClasses * attendancePercent / 100);
                  totalAttended += attended;
                  totalClasses += subjectTotalClasses;
                  
                  subjects.push({
                    subjectName: subjectCode,
                    subjectCode: subjectCode,
                    totalClasses: subjectTotalClasses,
                    attendedClasses: attended,
                    percentage: attendancePercent.toFixed(2),
                    extractionPattern: 'Pattern2-SemesterActivity'
                  });
                  console.log(`      Fieldset ${index}: ${subjectCode} - ${attendancePercent}%`);
                }
              }
            });
            
            if (subjects.length > 0) {
              debugInfo.patternsUsed.push('Pattern 2: SemesterActivity Fieldset');
              console.log(`   ✅ Pattern 2 Success: ${subjects.length} subjects found`);
            }
          }
        }

        // ============================================================
        // PATTERN 3: Colored Span Pattern (Green/Blue/Orange/Red)
        // ============================================================
        if (subjects.length === 0) {
          console.log('\n[Pattern 3] Colored Span Pattern...');
          const coloredSpans = document.querySelectorAll('span[style*="color"]');
          debugInfo.coloredSpansFound = coloredSpans.length;
          console.log(`   Found ${coloredSpans.length} colored spans`);
          
          const attendanceColors = ['#04B404', '#0040FF', '#FFBF00', '#FF0000', 
                                    'green', 'blue', 'orange', 'red'];
          
          coloredSpans.forEach((span, spanIndex) => {
            const text = span.textContent.trim();
            const match = text.match(/(\d+\.?\d*)/);
            
            if (match) {
              const value = parseFloat(match[1]);
              
              if (value >= 0 && value <= 100) {
                const style = span.getAttribute('style') || '';
                const hasAttendanceColor = attendanceColors.some(color => 
                  style.toLowerCase().includes(color.toLowerCase())
                );
                
                if (hasAttendanceColor) {
                  let subjectName = 'Subject ' + (subjects.length + 1);
                  
                  // Try to find subject code nearby
                  const fieldset = span.closest('fieldset');
                  if (fieldset) {
                    const fieldsetSpans = Array.from(fieldset.querySelectorAll('span'));
                    const percentSpanIndex = fieldsetSpans.indexOf(span);
                    
                    for (let i = percentSpanIndex - 1; i >= 0; i--) {
                      const spanText = fieldsetSpans[i].textContent.trim();
                      if (/^[A-Z0-9]{3,}$/i.test(spanText) &&
                          spanText !== 'CODE' &&
                          spanText !== 'SUBJECT' &&
                          spanText !== 'ATTENDANCE' &&
                          !spanText.includes('%') &&
                          spanText.length < 20) {
                        subjectName = spanText;
                        break;
                      }
                    }
                  }
                  
                  if (!subjects.find(s => s.subjectCode === subjectName && s.percentage === value.toFixed(2))) {
                    subjects.push({
                      subjectName: subjectName,
                      subjectCode: subjectName,
                      totalClasses: 100, // Estimated
                      attendedClasses: Math.round(value),
                      percentage: value.toFixed(2),
                      extractionPattern: 'Pattern3-ColoredSpan'
                    });
                    console.log(`      Span ${spanIndex}: ${subjectName} - ${value}%`);
                  }
                }
              }
            }
          });
          
          if (subjects.length > 0) {
            debugInfo.patternsUsed.push('Pattern 3: Colored Span');
            console.log(`   ✅ Pattern 3 Success: ${subjects.length} subjects found`);
          }
        }

        // ============================================================
        // PATTERN 4: Attendance-specific Elements
        // ============================================================
        if (subjects.length === 0) {
          console.log('\n[Pattern 4] Attendance-specific Elements...');
          const attendanceElements = document.querySelectorAll(
            '[class*="attendance"], [id*="attendance"], [class*="percent"], [id*="percent"]'
          );
          console.log(`   Found ${attendanceElements.length} attendance elements`);
          
          attendanceElements.forEach((element, index) => {
            const text = element.textContent.trim();
            const match = text.match(/(\d+\.?\d*)\s*%?/);
            
            if (match) {
              const value = parseFloat(match[1]);
              if (value >= 0 && value <= 100) {
                const subjectName = 'Subject ' + (subjects.length + 1);
                
                subjects.push({
                  subjectName: subjectName,
                  subjectCode: subjectName,
                  totalClasses: 100,
                  attendedClasses: Math.round(value),
                  percentage: value.toFixed(2),
                  extractionPattern: 'Pattern4-AttendanceElement'
                });
                console.log(`      Element ${index}: ${subjectName} - ${value}%`);
              }
            }
          });
          
          if (subjects.length > 0) {
            debugInfo.patternsUsed.push('Pattern 4: Attendance Elements');
            console.log(`   ✅ Pattern 4 Success: ${subjects.length} subjects found`);
          }
        }

        // ============================================================
        // PATTERN 5: Enhanced Table Pattern (Keyword-based)
        // ============================================================
        if (subjects.length === 0) {
          console.log('\n[Pattern 5] Enhanced Table Pattern (Keyword Search)...');
          const pageText = document.body.textContent;
          const hasKeywords = pageText.includes('CLASSES ATTENDED') && 
                            pageText.includes('TOTAL CONDUCTED') && 
                            pageText.includes('ATTENDANCE %');
          
          if (hasKeywords) {
            console.log('   Found attendance keywords in page text');
            
            // Find all elements with potential subject codes
            const allElements = Array.from(document.querySelectorAll('*'));
            const subjectCodes = [];
            const percentages = [];
            
            allElements.forEach(el => {
              const text = el.textContent.trim();
              if (el.children.length === 0) { // Leaf nodes only
                // Subject code pattern: 6+ alphanumeric
                if (/^[A-Z0-9]{6,}$/i.test(text) && text.length < 20) {
                  subjectCodes.push({ element: el, code: text });
                }
                
                // Percentage pattern
                const match = text.match(/^(\d+\.?\d*)\s*%?$/);
                if (match) {
                  const val = parseFloat(match[1]);
                  if (val >= 0 && val <= 100) {
                    percentages.push({ element: el, value: val });
                  }
                }
              }
            });
            
            console.log(`   Found ${subjectCodes.length} potential subject codes, ${percentages.length} percentages`);
            
            // Match codes with nearby percentages
            subjectCodes.forEach((code, index) => {
              if (index < percentages.length) {
                subjects.push({
                  subjectName: code.code,
                  subjectCode: code.code,
                  totalClasses: 100,
                  attendedClasses: Math.round(percentages[index].value),
                  percentage: percentages[index].value.toFixed(2),
                  extractionPattern: 'Pattern5-EnhancedTable'
                });
                console.log(`      Match ${index}: ${code.code} - ${percentages[index].value}%`);
              }
            });
            
            if (subjects.length > 0) {
              debugInfo.patternsUsed.push('Pattern 5: Enhanced Table');
              console.log(`   ✅ Pattern 5 Success: ${subjects.length} subjects found`);
            }
          }
        }

        // ============================================================
        // PATTERN 6: Any Percentage Values (Fallback)
        // ============================================================
        if (subjects.length === 0) {
          console.log('\n[Pattern 6] Any Percentage Values (Fallback)...');
          const allElements = document.querySelectorAll('*');
          const potentialPercentages = [];
          
          allElements.forEach(element => {
            const text = element.textContent.trim();
            if (element.children.length === 0 && text) { // Leaf nodes
              const match = text.match(/^(\d+\.?\d*)\s*%?$/);
              if (match) {
                const value = parseFloat(match[1]);
                if (value >= 0 && value <= 100) {
                  potentialPercentages.push({ value, element });
                }
              }
            }
          });
          
          console.log(`   Found ${potentialPercentages.length} potential percentages`);
          
          // Take reasonable number of percentages
          potentialPercentages.slice(0, 20).forEach((pot, index) => {
            subjects.push({
              subjectName: `Subject ${index + 1}`,
              subjectCode: `SUB${(index + 1).toString().padStart(2, '0')}`,
              totalClasses: 100,
              attendedClasses: Math.round(pot.value),
              percentage: pot.value.toFixed(2),
              extractionPattern: 'Pattern6-AnyPercentage'
            });
          });
          
          if (subjects.length > 0) {
            debugInfo.patternsUsed.push('Pattern 6: Any Percentage');
            console.log(`   ✅ Pattern 6 Success: ${subjects.length} subjects found`);
          }
        }

        console.log('='.repeat(80));
        console.log(`🎯 EXTRACTION COMPLETE: ${subjects.length} subjects found`);
        console.log(`   Patterns used: ${debugInfo.patternsUsed.join(', ')}`);
        console.log('='.repeat(80));

        // Recalculate totals if needed
        if (totalClasses === 0) {
          subjects.forEach(sub => {
            totalClasses += sub.totalClasses;
            totalAttended += sub.attendedClasses;
          });
        }
        
        // Calculate overall mean percentage (Simple Average - Extension Compatible)
        let overallPercentage = 0;
        if (subjects.length > 0) {
          const sumOfPercentages = subjects.reduce((sum, sub) => sum + parseFloat(sub.percentage), 0);
          overallPercentage = (sumOfPercentages / subjects.length).toFixed(2);
        }
        
        return {
          subjects,
          totalClasses,
          totalAttended,
          overallPercentage,
          extractionDebug: debugInfo
        };
      });
      
      console.log(`✅ Extracted ${attendanceData.subjects.length} subjects`);
      
      // ===== CALCULATE MEAN ATTENDANCE =====
      console.log('\n' + '='.repeat(80));
      console.log('� CALCULATING MEAN ATTENDANCE PERCENTAGE');
      console.log('='.repeat(80));
      
      // Display individual subject percentages first
      if (attendanceData.subjects.length > 0) {
        console.log('\n📚 INDIVIDUAL SUBJECT ATTENDANCE PERCENTAGES:');
        console.log('-'.repeat(80));
        
        let sumOfPercentages = 0;
        
        attendanceData.subjects.forEach((subject, index) => {
          const percentage = parseFloat(subject.percentage);
          sumOfPercentages += percentage;
          
          const status = percentage >= 75 ? '✅ SAFE' : 
                        percentage >= 70 ? '⚠️  WARN' : '❌ CRIT';
          
          console.log(`${(index + 1).toString().padStart(2)}. ${status} │ ${subject.subjectCode.padEnd(30)} │ ${subject.attendedClasses.toString().padStart(3)}/${subject.totalClasses.toString().padEnd(3)} │ ${percentage.toFixed(2).padStart(6)}%`);
        });
        
        console.log('-'.repeat(80));
        
        // Calculate mean in THREE ways (matching browser extension behavior)
        const meanByPercentages = sumOfPercentages / attendanceData.subjects.length;
        const meanByTotalClasses = attendanceData.totalClasses > 0 ? 
          (attendanceData.totalAttended / attendanceData.totalClasses * 100) : 0;
        
        console.log('\n📊 MEAN ATTENDANCE CALCULATION (Browser Extension Compatible):');
        console.log('-'.repeat(80));
        console.log(`Method 1 - Simple Average of Subject Percentages (Extension Method):`);
        console.log(`   Formula: (Sum of all subject percentages) ÷ (Number of subjects)`);
        console.log(`   Sum of all percentages: ${sumOfPercentages.toFixed(2)}%`);
        console.log(`   Number of subjects: ${attendanceData.subjects.length}`);
        console.log(`   Mean = ${sumOfPercentages.toFixed(2)} ÷ ${attendanceData.subjects.length} = ${meanByPercentages.toFixed(2)}%`);
        console.log('');
        console.log(`Method 2 - Weighted Average by Total Classes:`);
        console.log(`   Formula: (Total classes attended ÷ Total classes conducted) × 100`);
        console.log(`   Total classes attended: ${attendanceData.totalAttended}`);
        console.log(`   Total classes conducted: ${attendanceData.totalClasses}`);
        console.log(`   Mean = (${attendanceData.totalAttended} ÷ ${attendanceData.totalClasses}) × 100 = ${meanByTotalClasses.toFixed(2)}%`);
        console.log('-'.repeat(80));
        console.log(`\n🎯 PRIMARY MEAN (Simple Average - Extension Compatible): ${meanByPercentages.toFixed(2)}%`);
        console.log(`📊 ALTERNATIVE MEAN (Weighted Average): ${meanByTotalClasses.toFixed(2)}%`);
        console.log('-'.repeat(80));
        
        // Store both mean calculations - USE SIMPLE AVERAGE AS PRIMARY (matches browser extension)
        attendanceData.meanAttendance = meanByPercentages.toFixed(2); // Primary mean (extension-compatible)
        attendanceData.meanByPercentages = meanByPercentages.toFixed(2);
        attendanceData.meanByTotalClasses = meanByTotalClasses.toFixed(2);
        attendanceData.overallPercentage = meanByPercentages.toFixed(2); // Use simple average as overall
        
      }
      
      // Display final summary
      console.log('\n' + '='.repeat(80));
      console.log('📊 FINAL ATTENDANCE SUMMARY (http://mitsims.in/studentIndex.html)');
      console.log('='.repeat(80));
      console.log(`Total Subjects: ${attendanceData.subjects.length}`);
      console.log(`Total Classes Conducted: ${attendanceData.totalClasses}`);
      console.log(`Total Classes Attended: ${attendanceData.totalAttended}`);
      console.log('-'.repeat(80));
      console.log(`🎯 MEAN ATTENDANCE (Simple Average - Extension Method): ${attendanceData.overallPercentage}%`);
      console.log(`📊 MEAN ATTENDANCE (Weighted Average): ${attendanceData.meanByTotalClasses || attendanceData.overallPercentage}%`);
      console.log('='.repeat(80));
      
      // Display status based on SIMPLE AVERAGE (extension-compatible)
      const meanPercent = parseFloat(attendanceData.overallPercentage);
      if (meanPercent >= 75) {
        console.log('✅ STATUS: SAFE - Mean attendance is above 75%');
      } else if (meanPercent >= 70) {
        console.log('⚠️  STATUS: WARNING - Mean attendance is between 70-75%');
      } else {
        console.log('❌ STATUS: CRITICAL - Mean attendance is below 70%');
      }
      console.log('='.repeat(80) + '\n');
      
      // Validate extracted data
      if (attendanceData.subjects.length === 0) {
        console.log('⚠️ WARNING: No subject data extracted');
        console.log('   This likely means the website structure is different than expected');
        console.log('   Check screenshots to see what the page looks like');
        
        // Return empty but valid structure
        throw new Error('No attendance data found on page. Please check screenshots and verify attendance table is visible.');
      }
      
      // Add status to subjects
      attendanceData.subjects = attendanceData.subjects.map(subject => ({
        ...subject,
        status: subject.percentage >= 75 ? 'safe' : 
                subject.percentage >= 70 ? 'warning' : 'critical'
      }));
      
      console.log('✅ Attendance data extracted successfully');
      console.log(`   Overall: ${attendanceData.overallPercentage}%`);
      console.log(`   Total Subjects: ${attendanceData.subjects.length}`);
      
      return attendanceData;
      
    } catch (error) {
      console.error('Error getting attendance:', error.message);
      throw error;
    }
  }

  /**
   * Take screenshot (for debugging)
   */
  async takeScreenshot(filename = 'screenshot.png') {
    try {
      await this.page.screenshot({ path: filename, fullPage: true });
      console.log(`Screenshot saved: ${filename}`);
    } catch (error) {
      console.error('Error taking screenshot:', error);
    }
  }

  /**
   * Navigate to Subject Details page and extract actual subject names
   * Returns a map of subject codes to actual names from the website
   */
  async getSubjectDetails() {
    try {
      console.log('\n' + '='.repeat(80));
      console.log('📚 EXTRACTING ACTUAL SUBJECT NAMES FROM SUBJECT DETAILS PAGE');
      console.log('='.repeat(80));

      // Wait for page to be fully loaded
      console.log('⏳ Waiting for dashboard to fully load...');
      await this.page.waitForTimeout(5000);

      // Find and click the "Subject Details" link
      console.log('🔍 Looking for "Subject Details" link...');
      
      // Debug: Log all clickable elements with text
      const availableLinks = await this.page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('a, button, div[onclick], span[onclick], div.x-btn'));
        return elements.map(el => ({
          tag: el.tagName,
          text: el.textContent.trim().substring(0, 50),
          class: el.className,
          onclick: el.onclick ? 'yes' : 'no'
        })).filter(el => el.text.length > 0).slice(0, 30);
      });
      console.log('Available clickable elements:', JSON.stringify(availableLinks, null, 2));
      
      const subjectDetailsClicked = await this.page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a, button, div[onclick], span[onclick], div.x-btn, span'));
        const subjectLink = links.find(el => {
          const text = el.textContent.trim();
          return text === 'Subject Details' || text.toLowerCase().includes('subject details') || text.toLowerCase() === 'subject details';
        });
        
        if (subjectLink) {
          console.log('Found Subject Details link:', subjectLink.textContent.trim());
          subjectLink.click();
          return true;
        }
        return false;
      });

      if (!subjectDetailsClicked) {
        console.log('⚠️ Could not find "Subject Details" link - skipping subject name extraction');
        console.log('   Will use subject codes as names instead');
        return {};
      }

      console.log('✅ Clicked "Subject Details" link');
      
      // Wait for navigation or content to load
      await this.page.waitForTimeout(3000);
      
      // Take screenshot of subject details page
      await this.takeScreenshot('screenshots/07-subject-details.png');

      // Extract subject details from the page
      console.log('📊 Extracting subject details...');
      
      // First, let's see what's on the page
      const pageInfo = await this.page.evaluate(() => {
        return {
          url: window.location.href,
          title: document.title,
          bodyText: document.body.textContent.substring(0, 2000),
          tableCount: document.querySelectorAll('table').length,
          divCount: document.querySelectorAll('div').length
        };
      });
      
      console.log('\n📄 SUBJECT DETAILS PAGE INFO:');
      console.log(`   URL: ${pageInfo.url}`);
      console.log(`   Title: ${pageInfo.title}`);
      console.log(`   Tables: ${pageInfo.tableCount}`);
      console.log(`   Divs: ${pageInfo.divCount}`);
      console.log('\n📝 PAGE CONTENT (first 2000 chars):');
      console.log(pageInfo.bodyText);
      console.log('\n');
      
      const subjectMap = await this.page.evaluate(() => {
        const subjects = {};
        
        // Try to find table with subject information
        const tables = document.querySelectorAll('table');
        console.log(`Found ${tables.length} tables on Subject Details page`);
        
        tables.forEach((table, tableIndex) => {
          const text = table.textContent.toLowerCase();
          
          console.log(`\nTable ${tableIndex + 1} content preview:`, text.substring(0, 200));
          
          // Look for tables with subject code and subject name columns
          if (text.includes('subject') || text.includes('code') || text.includes('name')) {
            console.log(`Table ${tableIndex + 1} might contain subject details`);
            
            const rows = table.querySelectorAll('tr');
            console.log(`   Processing ${rows.length} rows...`);
            
            // Find header row to identify column positions
            let codeColIndex = -1;
            let nameColIndex = -1;
            
            rows.forEach((row, rowIndex) => {
              const cells = Array.from(row.querySelectorAll('td, th'));
              const cellTexts = cells.map(c => c.textContent.trim());
              
              // Debug: log first few rows
              if (rowIndex < 5) {
                console.log(`   Row ${rowIndex}: [${cellTexts.join(' | ')}]`);
              }
              
              // Check if this is a header row
              if (rowIndex === 0 || row.querySelector('th')) {
                cellTexts.forEach((cellText, colIndex) => {
                  const lower = cellText.toLowerCase();
                  if (lower.includes('code') || lower.includes('subject code')) {
                    codeColIndex = colIndex;
                    console.log(`   Found code column at index ${colIndex}`);
                  }
                  if (lower.includes('name') || lower.includes('subject name') || lower.includes('title')) {
                    nameColIndex = colIndex;
                    console.log(`   Found name column at index ${colIndex}`);
                  }
                });
              } else if (codeColIndex >= 0 && nameColIndex >= 0) {
                // Extract data row
                const code = cellTexts[codeColIndex]?.trim();
                const name = cellTexts[nameColIndex]?.trim();
                
                if (code && name && code !== '' && name !== '') {
                  subjects[code] = name;
                  console.log(`   ${code} → ${name}`);
                }
              }
            });
          }
        });
        
        return subjects;
      });

      console.log('\n✅ SUBJECT DETAILS EXTRACTION COMPLETE');
      console.log(`Found ${Object.keys(subjectMap).length} subject mappings:`);
      Object.entries(subjectMap).forEach(([code, name]) => {
        console.log(`   ${code} → ${name}`);
      });
      console.log('='.repeat(80) + '\n');

      return subjectMap;
      
    } catch (error) {
      console.error('❌ Error extracting subject details:', error.message);
      return {};
    }
  }

  /**
   * Close browser
   */
  async close() {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        this.page = null;
      }
    } catch (error) {
      console.error('Error closing browser:', error);
    }
  }

  /**
   * Main method to fetch attendance for a student
   */
  async fetchAttendance(studentId, encryptedPassword) {
    // Check if mock mode is enabled
    if (process.env.USE_MOCK_DATA === 'true') {
      console.log('🎭 MOCK MODE: Returning sample attendance data');
      return this.getMockAttendance(studentId);
    }
    
    try {
      await this.initialize();
      await this.login(studentId, encryptedPassword);
      
      // Get actual subject names from Subject Details page
      const subjectNameMap = await this.getSubjectDetails();
      
      // Navigate back to attendance page (after clicking Subject Details)
      console.log('🔙 Navigating back to dashboard for attendance...');
      await this.page.goto(`${this.baseUrl}/studentIndex.html`, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      await this.page.waitForTimeout(2000);
      
      // Get attendance data
      const attendanceData = await this.getAttendance();
      
      // Update subject names with actual names from the website
      if (Object.keys(subjectNameMap).length > 0 && attendanceData.subjects) {
        console.log('\n📝 Updating subject names with actual names from website...');
        attendanceData.subjects = attendanceData.subjects.map(subject => {
          const code = subject.subjectCode;
          
          // Try to find the actual name from subject details
          let actualName = null;
          
          // Try exact match first
          if (subjectNameMap[code]) {
            actualName = subjectNameMap[code];
          } else {
            // Try without year prefix (23CSM107 → CSM107)
            const codeWithoutYear = code.replace(/^\d{2}/, '');
            if (subjectNameMap[codeWithoutYear]) {
              actualName = subjectNameMap[codeWithoutYear];
            }
          }
          
          if (actualName) {
            console.log(`   ${code}: ${subject.subjectName} → ${actualName}`);
            return {
              ...subject,
              subjectName: actualName
            };
          } else {
            console.log(`   ${code}: No mapping found, keeping ${subject.subjectName}`);
            return subject;
          }
        });
      }
      
      return {
        success: true,
        data: attendanceData
      };
      
    } catch (error) {
      console.error('Error fetching attendance:', error.message);
      console.error('Stack trace:', error.stack);
      
      // Take screenshot for debugging
      if (this.page) {
        await this.takeScreenshot(`screenshots/error-${studentId}-${Date.now()}.png`);
        
        // Wait before closing so user can see the error
        if (process.env.HEADLESS_MODE === 'false') {
          console.log('⏸️ Browser will stay open for 10 seconds so you can see the error...');
          await this.page.waitForTimeout(10000);
        }
      }
      
      return {
        success: false,
        error: error.message
      };
      
    } finally {
      await this.close();
    }
  }

  /**
   * Return mock attendance data for testing
   */
  getMockAttendance(studentId) {
    const mockSubjects = [
      { name: 'Data Structures', code: 'CS201', attended: 45, total: 50 },
      { name: 'Database Management', code: 'CS202', attended: 38, total: 48 },
      { name: 'Operating Systems', code: 'CS203', attended: 42, total: 52 },
      { name: 'Computer Networks', code: 'CS204', attended: 35, total: 50 },
      { name: 'Software Engineering', code: 'CS205', attended: 40, total: 45 }
    ];

    const subjects = mockSubjects.map(sub => {
      const percentage = (sub.attended / sub.total * 100).toFixed(2);
      return {
        subjectName: sub.name,
        subjectCode: sub.code,
        totalClasses: sub.total,
        attendedClasses: sub.attended,
        percentage: percentage,
        status: percentage >= 75 ? 'safe' : percentage >= 70 ? 'warning' : 'critical'
      };
    });

    const totalClasses = mockSubjects.reduce((sum, sub) => sum + sub.total, 0);
    const totalAttended = mockSubjects.reduce((sum, sub) => sum + sub.attended, 0);
    const overallPercentage = (totalAttended / totalClasses * 100).toFixed(2);

    console.log(`✅ Mock data generated for ${studentId}: ${overallPercentage}% overall`);

    return {
      success: true,
      data: {
        subjects,
        totalClasses,
        totalAttended,
        overallPercentage
      }
    };
  }
}

module.exports = MITSIMSScraper;
