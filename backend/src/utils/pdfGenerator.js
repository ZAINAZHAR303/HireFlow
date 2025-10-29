const puppeteer = require('puppeteer');

/**
 * Clean markdown and prepare it for parsing (same as frontend)
 */
function cleanMarkdown(markdown) {
  let text = markdown;
  
  // Remove code fences
  text = text.replace(/```markdown\n/g, '');
  text = text.replace(/```\n/g, '');
  text = text.replace(/```/g, '');
  
  return text;
}

/**
 * Parse markdown resume content into structured sections
 */
function parseResumeMarkdown(markdown) {
  // Clean markdown first
  markdown = cleanMarkdown(markdown);
  
  const sections = [];
  const lines = markdown.split('\n');
  let currentSection = null;
  let currentSubsection = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // H1 - Name
    if (line.startsWith('# ')) {
      sections.push({
        type: 'header',
        name: line.substring(2).trim(),
        contact: []
      });
    }
    // Contact info (look for next line after name)
    else if (sections.length > 0 && sections[sections.length - 1].type === 'header' && 
             (line.includes('@') || line.includes('linkedin') || line.match(/\d{3}-\d{3}-\d{4}/))) {
      sections[sections.length - 1].contact.push(line.trim());
    }
    // H2 - Section headers
    else if (line.startsWith('## ')) {
      currentSection = {
        type: 'section',
        title: line.substring(3).trim(),
        content: []
      };
      sections.push(currentSection);
      currentSubsection = null;
    }
    // H3 - Subsection (job title, project name)
    else if (line.startsWith('### ')) {
      currentSubsection = {
        type: 'subsection',
        title: line.substring(4).trim(),
        details: '',
        items: []
      };
      if (currentSection) {
        currentSection.content.push(currentSubsection);
      }
    }
    // Bold text (company, dates, location)
    else if (line.startsWith('**') && line.endsWith('**')) {
      const text = line.replace(/\*\*/g, '').trim();
      if (currentSection && !currentSubsection) {
        currentSection.content.push({ type: 'bold', text });
      } else if (currentSubsection) {
        currentSubsection.details += (currentSubsection.details ? ' ' : '') + text;
      }
    }
    // Bullet points
    else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      const bulletText = line.trim().substring(2);
      if (currentSubsection) {
        currentSubsection.items.push(bulletText);
      } else if (currentSection) {
        currentSection.content.push({ type: 'bullet', text: bulletText });
      }
    }
    // Regular paragraph
    else if (line.trim() && currentSection) {
      if (currentSubsection && !currentSubsection.details) {
        currentSubsection.details = line.trim();
      } else {
        currentSection.content.push({ type: 'text', text: line.trim() });
      }
    }
  }

  return sections;
}

/**
 * Generate HTML from parsed resume sections
 */
function generateResumeHTML(sections) {
  let contentHTML = '';

  sections.forEach(section => {
    if (section.type === 'header') {
      contentHTML += `
        <div class="header">
          <h1>${section.name}</h1>
          <div class="contact">
            ${section.contact.map(c => {
              // Make emails and links clickable
              if (c.includes('@')) {
                const email = c.match(/[\w.-]+@[\w.-]+/)[0];
                return c.replace(email, `<a href="mailto:${email}">${email}</a>`);
              }
              return c;
            }).join(' | ')}
          </div>
        </div>
      `;
    } else if (section.type === 'section') {
      contentHTML += `
        <div class="section">
          <h2>${section.title.toUpperCase()}</h2>
          <div class="section-content">
      `;

      section.content.forEach(item => {
        if (item.type === 'bold') {
          contentHTML += `<p class="bold-text">${item.text}</p>`;
        } else if (item.type === 'bullet') {
          contentHTML += `<li>${item.text}</li>`;
        } else if (item.type === 'text') {
          contentHTML += `<p>${item.text}</p>`;
        } else if (item.type === 'subsection') {
          contentHTML += `
            <div class="subsection">
              <div class="subsection-header">
                <div class="subsection-title">${item.title}</div>
                ${item.details ? `<div class="subsection-details">${item.details}</div>` : ''}
              </div>
              ${item.items.length > 0 ? `
                <ul class="highlights">
                  ${item.items.map(bullet => `<li>${bullet}</li>`).join('')}
                </ul>
              ` : ''}
            </div>
          `;
        }
      });

      contentHTML += `
          </div>
        </div>
      `;
    }
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Charter', 'Georgia', serif;
      font-size: 14pt;
      line-height: 1.8;
      color: #1f2937;
      background: white;
      padding: 40px 60px;
      max-width: 850px;
      margin: 0 auto;
    }

    .header {
      text-align: left;
      margin-bottom: 24px;
    }

    .header h1 {
      font-size: 20pt;
      font-weight: normal;
      letter-spacing: 0.3px;
      margin-bottom: 8px;
    }

    .contact {
      font-size: 14pt;
      color: #1f2937;
      line-height: 1.8;
    }

    .contact a {
      color: #1f2937;
      text-decoration: none;
    }

    .section {
      margin-top: 24px;
      margin-bottom: 24px;
    }

    .section h2 {
      font-size: 16pt;
      font-weight: bold;
      text-align: left;
      margin-bottom: 12px;
      margin-top: 24px;
      letter-spacing: 0.3px;
      display: block;
    }

    .section h2::after {
      content: '';
      display: none;
    }

    .section-content {
      margin-left: 0;
    }

    .subsection {
      margin-bottom: 16px;
    }

    .subsection-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 8px;
    }

    .subsection-title {
      font-weight: normal;
      font-size: 14pt;
    }

    .subsection-details {
      font-size: 14pt;
      color: #1f2937;
      text-align: right;
    }

    .bold-text {
      font-weight: normal;
      margin: 8px 0;
    }

    ul.highlights {
      margin-left: 20px;
      margin-top: 8px;
      margin-bottom: 8px;
      padding-left: 0;
      list-style-position: outside;
      list-style-type: disc;
    }

    ul.highlights li {
      margin-bottom: 4px;
      padding-left: 4px;
      line-height: 1.8;
      font-size: 14pt;
    }

    ul.highlights li::marker {
      content: '• ';
      font-size: 14pt;
    }

    p {
      margin: 4px 0;
      line-height: 1.8;
      font-size: 14pt;
    }

    /* Two column layout for experience/education */
    .two-col {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .two-col-left {
      flex: 1;
      font-weight: normal;
    }

    .two-col-right {
      text-align: right;
      font-size: 14pt;
      color: #1f2937;
    }

    /* Page break control */
    .section {
      page-break-inside: avoid;
    }

    .subsection {
      page-break-inside: avoid;
    }

    @page {
      size: letter;
      margin: 40px 60px;
    }

    /* Print optimization */
    @media print {
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  ${contentHTML}
</body>
</html>
  `;
}

/**
 * Generate PDF from markdown resume using Puppeteer
 */
async function generateResumePDF(resumeMarkdown, candidateName = 'Candidate') {
  let browser;
  try {
    console.log('🚀 Starting Puppeteer PDF generation...');
    console.log('📝 Markdown length:', resumeMarkdown.length);
    
    // Parse markdown to structured data
    const sections = parseResumeMarkdown(resumeMarkdown);
    console.log('📊 Parsed sections:', sections.length);
    
    // Generate HTML
    const html = generateResumeHTML(sections);
    console.log('🎨 HTML generated, length:', html.length);

    // Launch headless browser
    console.log('🌐 Launching Puppeteer browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    console.log('📄 Setting HTML content...');
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Generate PDF
    console.log('🖨️ Generating PDF...');
    const pdfBuffer = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: {
        top: '2cm',
        right: '2cm',
        bottom: '2cm',
        left: '2cm'
      }
    });

    console.log('✅ PDF generated successfully, size:', pdfBuffer.length, 'bytes');
    await browser.close();
    return pdfBuffer;

  } catch (error) {
    console.error('❌ Puppeteer PDF generation error:', error);
    if (browser) {
      await browser.close();
    }
    throw error;
  }
}

module.exports = { generateResumePDF };
