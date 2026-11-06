/**
 * Client-side résumé text extraction (PDF / DOCX / plain text).
 *
 * Runs in the browser so no server is needed. Libraries are dynamically
 * imported so they're code-split out of the main bundle and only loaded when a
 * user actually uploads a résumé.
 */

async function extractPdf(file) {
  const pdfjs = await import('pdfjs-dist');
  // Load the worker from a CDN matching the installed version (runs in the
  // user's browser, so any CDN is fine at runtime).
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
  const data = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data }).promise;
  let text = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((it) => it.str).join(' ') + '\n';
  }
  return text.trim();
}

async function extractDocx(file) {
  const mammoth = await import('mammoth');
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return (result.value || '').trim();
}

/**
 * @param {File} file
 * @returns {Promise<string>} extracted plain text (empty string on failure)
 */
export async function extractResumeText(file) {
  if (!file) return '';
  const name = (file.name || '').toLowerCase();
  const type = file.type || '';
  try {
    if (type === 'application/pdf' || name.endsWith('.pdf')) return await extractPdf(file);
    if (
      name.endsWith('.docx') ||
      type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      return await extractDocx(file);
    }
    // Plain text / unknown — best effort.
    return (await file.text()).trim();
  } catch (err) {
    console.error('Resume text extraction failed:', err);
    return '';
  }
}
