const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;

/**
 * Apply Agent - Automates job application form filling
 */
class ApplyAgent {
  constructor() {
    this.browser = null;
    this.page = null;
    this.screenshots = [];
  }

  /**
   * Initialize browser
   */
  async init() {
    console.log('🌐 Launching browser for application automation...');
    this.browser = await puppeteer.launch({
      headless: false, // Show browser for demo/debugging
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled'
      ]
    });
    this.page = await this.browser.newPage();
    
    // Set viewport
    await this.page.setViewport({ width: 1280, height: 800 });
    
    // Set user agent to avoid detection
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  }

  /**
   * Take screenshot and save
   */
  async takeScreenshot(stepName) {
    const timestamp = Date.now();
    const screenshotPath = path.join(__dirname, '..', 'screenshots', `${stepName}_${timestamp}.png`);
    
    // Ensure screenshots directory exists
    await fs.mkdir(path.dirname(screenshotPath), { recursive: true });
    
    await this.page.screenshot({ path: screenshotPath, fullPage: false });
    this.screenshots.push({ step: stepName, path: screenshotPath });
    
    console.log(`📸 Screenshot saved: ${stepName}`);
    return screenshotPath;
  }

  /**
   * Detect form fields using heuristics
   */
  async detectFormFields() {
    console.log('🔍 Detecting form fields...');
    
    const fields = await this.page.evaluate(() => {
      const detectedFields = {
        name: [],
        email: [],
        phone: [],
        resume: [],
        coverLetter: [],
        linkedin: [],
        portfolio: [],
        other: []
      };

      // Find all input, textarea, and select elements
      const inputs = document.querySelectorAll('input, textarea, select');
      
      inputs.forEach(input => {
        const id = input.id?.toLowerCase() || '';
        const name = input.name?.toLowerCase() || '';
        const placeholder = input.placeholder?.toLowerCase() || '';
        const type = input.type?.toLowerCase() || '';
        const label = input.closest('label')?.textContent?.toLowerCase() || '';
        
        const combined = `${id} ${name} ${placeholder} ${type} ${label}`;
        
        // Categorize fields
        if (combined.includes('name') && !combined.includes('company')) {
          detectedFields.name.push({ selector: input.id ? `#${input.id}` : `[name="${input.name}"]`, type: input.type });
        } else if (combined.includes('email') || type === 'email') {
          detectedFields.email.push({ selector: input.id ? `#${input.id}` : `[name="${input.name}"]`, type: input.type });
        } else if (combined.includes('phone') || combined.includes('mobile') || type === 'tel') {
          detectedFields.phone.push({ selector: input.id ? `#${input.id}` : `[name="${input.name}"]`, type: input.type });
        } else if (combined.includes('resume') || combined.includes('cv') && type === 'file') {
          detectedFields.resume.push({ selector: input.id ? `#${input.id}` : `[name="${input.name}"]`, type: input.type });
        } else if (combined.includes('cover') && type === 'file') {
          detectedFields.coverLetter.push({ selector: input.id ? `#${input.id}` : `[name="${input.name}"]`, type: input.type });
        } else if (combined.includes('linkedin')) {
          detectedFields.linkedin.push({ selector: input.id ? `#${input.id}` : `[name="${input.name}"]`, type: input.type });
        } else if (combined.includes('portfolio') || combined.includes('website') || combined.includes('github')) {
          detectedFields.portfolio.push({ selector: input.id ? `#${input.id}` : `[name="${input.name}"]`, type: input.type });
        } else if (input.type !== 'hidden' && input.type !== 'submit') {
          detectedFields.other.push({ 
            selector: input.id ? `#${input.id}` : `[name="${input.name}"]`, 
            type: input.type,
            label: label 
          });
        }
      });

      return detectedFields;
    });

    console.log('📋 Detected fields:', JSON.stringify(fields, null, 2));
    return fields;
  }

  /**
   * Fill form with user data
   */
  async fillForm(userData, detectedFields) {
    console.log('✍️ Filling form fields...');
    const steps = [];

    try {
      // Fill name
      if (detectedFields.name.length > 0 && userData.fullName) {
        await this.page.type(detectedFields.name[0].selector, userData.fullName, { delay: 50 });
        steps.push({ step: 'fill_name', status: 'success', timestamp: new Date() });
        console.log('✅ Name filled');
      }

      // Fill email
      if (detectedFields.email.length > 0 && userData.email) {
        await this.page.type(detectedFields.email[0].selector, userData.email, { delay: 50 });
        steps.push({ step: 'fill_email', status: 'success', timestamp: new Date() });
        console.log('✅ Email filled');
      }

      // Fill phone
      if (detectedFields.phone.length > 0 && userData.phone) {
        await this.page.type(detectedFields.phone[0].selector, userData.phone, { delay: 50 });
        steps.push({ step: 'fill_phone', status: 'success', timestamp: new Date() });
        console.log('✅ Phone filled');
      }

      // Fill LinkedIn
      if (detectedFields.linkedin.length > 0 && userData.linkedin) {
        await this.page.type(detectedFields.linkedin[0].selector, userData.linkedin, { delay: 50 });
        steps.push({ step: 'fill_linkedin', status: 'success', timestamp: new Date() });
        console.log('✅ LinkedIn filled');
      }

      // Fill portfolio/GitHub
      if (detectedFields.portfolio.length > 0 && userData.portfolio) {
        await this.page.type(detectedFields.portfolio[0].selector, userData.portfolio, { delay: 50 });
        steps.push({ step: 'fill_portfolio', status: 'success', timestamp: new Date() });
        console.log('✅ Portfolio filled');
      }

      // Upload resume
      if (detectedFields.resume.length > 0 && userData.resumePath) {
        const fileInput = await this.page.$(detectedFields.resume[0].selector);
        if (fileInput) {
          await fileInput.uploadFile(userData.resumePath);
          steps.push({ step: 'upload_resume', status: 'success', timestamp: new Date() });
          console.log('✅ Resume uploaded');
        }
      }

      // Upload cover letter
      if (detectedFields.coverLetter.length > 0 && userData.coverLetterPath) {
        const fileInput = await this.page.$(detectedFields.coverLetter[0].selector);
        if (fileInput) {
          await fileInput.uploadFile(userData.coverLetterPath);
          steps.push({ step: 'upload_cover_letter', status: 'success', timestamp: new Date() });
          console.log('✅ Cover letter uploaded');
        }
      }

      await this.takeScreenshot('form_filled');
      
    } catch (error) {
      console.error('❌ Error filling form:', error);
      steps.push({ step: 'fill_error', status: 'failed', timestamp: new Date() });
      throw error;
    }

    return steps;
  }

  /**
   * Find and click submit button
   */
  async submitForm() {
    console.log('🚀 Looking for submit button...');
    
    const submitButton = await this.page.evaluate(() => {
      // Look for submit buttons
      const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
      
      const submitBtn = buttons.find(btn => {
        const text = btn.textContent?.toLowerCase() || btn.value?.toLowerCase() || '';
        return text.includes('submit') || text.includes('apply') || text.includes('send');
      });

      if (submitBtn) {
        return submitBtn.id ? `#${submitBtn.id}` : null;
      }
      return null;
    });

    if (submitButton) {
      await this.page.click(submitButton);
      console.log('✅ Submit button clicked');
      await new Promise(resolve => setTimeout(resolve, 2000));
      await this.takeScreenshot('after_submit');
      return true;
    } else {
      console.log('⚠️ Submit button not found');
      return false;
    }
  }

  /**
   * Main apply function
   */
  async apply(applyUrl, userData, options = {}) {
    const startTime = Date.now();
    const result = {
      status: 'pending',
      steps: [],
      screenshots: [],
      detectedFields: null,
      duration: 0,
      error: null
    };

    try {
      // Initialize browser
      await this.init();
      result.steps.push({ step: 'browser_launched', status: 'success', timestamp: new Date() });

      // Navigate to application URL
      console.log(`🔗 Navigating to: ${applyUrl}`);
      await this.page.goto(applyUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      result.steps.push({ step: 'page_loaded', status: 'success', timestamp: new Date() });
      await this.takeScreenshot('page_loaded');

      // Detect form fields
      const detectedFields = await this.detectFormFields();
      result.detectedFields = detectedFields;
      result.steps.push({ step: 'fields_detected', status: 'success', timestamp: new Date() });

      // Wait a bit for any dynamic content
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Fill form
      const fillSteps = await this.fillForm(userData, detectedFields);
      result.steps.push(...fillSteps);

      // Submit form (only if option is enabled)
      if (options.autoSubmit) {
        const submitted = await this.submitForm();
        if (submitted) {
          result.steps.push({ step: 'form_submitted', status: 'success', timestamp: new Date() });
          result.status = 'success';
        } else {
          result.steps.push({ step: 'submit_button_not_found', status: 'warning', timestamp: new Date() });
          result.status = 'partial_success';
        }
      } else {
        console.log('⏸️ Auto-submit disabled - form filled but not submitted');
        result.status = 'filled_not_submitted';
      }

    } catch (error) {
      console.error('❌ Application automation error:', error);
      result.status = 'failed';
      result.error = error.message;
      result.steps.push({ step: 'error', status: 'failed', timestamp: new Date() });
      await this.takeScreenshot('error');
    } finally {
      result.duration = Date.now() - startTime;
      result.screenshots = this.screenshots;
      
      // Close browser
      if (this.browser) {
        await this.browser.close();
        console.log('🔒 Browser closed');
      }
    }

    return result;
  }
}

module.exports = ApplyAgent;
