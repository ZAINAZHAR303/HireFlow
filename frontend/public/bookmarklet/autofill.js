/**
 * HireFlow Auto-Fill Bookmarklet
 * Drag this to your bookmarks bar and click it on any job application page
 */

(function() {
  // Get user data from HireFlow (stored during resume generation)
  const hireflowData = localStorage.getItem('hireflow_autofill_data');
  
  if (!hireflowData) {
    alert('❌ No HireFlow data found. Please generate a resume first on hireflow.com');
    return;
  }
  
  const userData = JSON.parse(hireflowData);
  
  // Create floating panel
  const panel = document.createElement('div');
  panel.id = 'hireflow-autofill-panel';
  panel.innerHTML = `
    <div style="position: fixed; top: 20px; right: 20px; z-index: 999999; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); font-family: system-ui; max-width: 300px;">
      <div style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">🤖 HireFlow Auto-Fill</div>
      <div style="font-size: 13px; margin-bottom: 15px; opacity: 0.9;">Click "Fill Form" to auto-fill detected fields</div>
      <button id="hireflow-fill-btn" style="width: 100%; padding: 10px; background: white; color: #667eea; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 14px;">
        Fill Form
      </button>
      <button id="hireflow-close-btn" style="width: 100%; padding: 8px; background: rgba(255,255,255,0.2); color: white; border: none; border-radius: 6px; margin-top: 8px; cursor: pointer; font-size: 13px;">
        Close
      </button>
      <div id="hireflow-status" style="margin-top: 12px; font-size: 12px; text-align: center;"></div>
    </div>
  `;
  document.body.appendChild(panel);
  
  // Close button
  document.getElementById('hireflow-close-btn').onclick = () => {
    panel.remove();
  };
  
  // Fill button
  document.getElementById('hireflow-fill-btn').onclick = () => {
    const status = document.getElementById('hireflow-status');
    status.textContent = 'Filling form...';
    
    let filled = 0;
    
    // Find all input, textarea, select elements
    const inputs = document.querySelectorAll('input, textarea, select');
    
    inputs.forEach(input => {
      const id = (input.id || '').toLowerCase();
      const name = (input.name || '').toLowerCase();
      const placeholder = (input.placeholder || '').toLowerCase();
      const type = (input.type || '').toLowerCase();
      const label = (input.closest('label')?.textContent || '').toLowerCase();
      
      const combined = `${id} ${name} ${placeholder} ${type} ${label}`;
      
      // Skip hidden and submit buttons
      if (type === 'hidden' || type === 'submit' || type === 'button') return;
      
      // Fill based on field type
      if (combined.includes('name') && !combined.includes('company') && userData.fullName) {
        input.value = userData.fullName;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        filled++;
      } else if ((combined.includes('email') || type === 'email') && userData.email) {
        input.value = userData.email;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        filled++;
      } else if ((combined.includes('phone') || type === 'tel') && userData.phone) {
        input.value = userData.phone;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        filled++;
      } else if (combined.includes('linkedin') && userData.linkedin) {
        input.value = userData.linkedin;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        filled++;
      } else if ((combined.includes('portfolio') || combined.includes('website') || combined.includes('github')) && userData.portfolio) {
        input.value = userData.portfolio;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        filled++;
      }
    });
    
    status.innerHTML = `✅ Filled ${filled} fields!<br><small>Review and submit manually</small>`;
    
    // Highlight filled fields
    inputs.forEach(input => {
      if (input.value && input.type !== 'hidden') {
        input.style.border = '2px solid #10b981';
      }
    });
  };
})();
