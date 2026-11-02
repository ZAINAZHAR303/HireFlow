/**
 * HireFlow field matcher — pure logic shared by the content script and tests.
 *
 * Given a form field's descriptive attributes, decide which profile value (if
 * any) belongs in it. Matching is attribute-driven (autocomplete/type first,
 * then id/name/placeholder/label keywords) so it works across hand-rolled forms
 * and the big ATS platforms (Greenhouse, Lever, Workday, Ashby).
 *
 * Loaded both as a plain content script (attaches to window.HireFlowMatcher)
 * and as a CommonJS module in Node tests.
 */
(function (root) {
  // Field keys in priority order; first match wins.
  const RULES = [
    {
      key: 'email',
      test: (d) => d.type === 'email' || d.autocomplete === 'email' || /\be ?mail\b/.test(d.text),
    },
    {
      key: 'phone',
      test: (d) =>
        d.type === 'tel' ||
        /\b(tel|telephone)\b/.test(d.autocomplete) ||
        /\b(phone|mobile|cell)\b/.test(d.text),
    },
    {
      key: 'linkedin',
      test: (d) => /linkedin/.test(d.text) || /linkedin/.test(d.autocomplete),
    },
    {
      key: 'github',
      test: (d) => /\b(github|git hub)\b/.test(d.text),
    },
    {
      key: 'portfolio',
      test: (d) => /\b(portfolio|website|personal site|url)\b/.test(d.text),
    },
    {
      key: 'location',
      test: (d) =>
        d.autocomplete === 'address-level2' ||
        /\b(location|city|town|address)\b/.test(d.text),
    },
    // Name handling: distinguish first / last / full. Exclude company/user names.
    {
      key: 'firstName',
      test: (d) =>
        d.autocomplete === 'given-name' ||
        (/\b(first name|given name|forename|fname|first_name)\b/.test(d.text) && !isCompany(d)),
    },
    {
      key: 'lastName',
      test: (d) =>
        d.autocomplete === 'family-name' ||
        (/\b(last name|family name|surname|lname|last_name)\b/.test(d.text) && !isCompany(d)),
    },
    {
      key: 'fullName',
      test: (d) =>
        d.autocomplete === 'name' ||
        (/\bname\b/.test(d.text) && !isCompany(d) && !/\b(user|first|last|given|family|sur|fore)\b/.test(d.text)),
    },
    {
      key: 'coverLetter',
      test: (d) => /\b(cover letter|coverletter|message|why do you|tell us)\b/.test(d.text),
    },
  ];

  function isCompany(d) {
    return /\b(company|employer|organization|organisation|business)\b/.test(d.text);
  }

  function normalize(s) {
    return String(s || '').toLowerCase().trim();
  }

  /**
   * @param {object} desc { id, name, placeholder, type, label, ariaLabel, autocomplete }
   * @returns {string|null} field key
   */
  function matchField(desc) {
    const d = {
      type: normalize(desc.type),
      autocomplete: normalize(desc.autocomplete),
      // Underscores/hyphens are run together with words (e.g. "github_url",
      // "last-name") and would defeat \b boundaries, so flatten them to spaces.
      text: normalize(
        [desc.id, desc.name, desc.placeholder, desc.label, desc.ariaLabel].filter(Boolean).join(' ')
      ).replace(/[_-]/g, ' '),
    };
    if (d.type === 'hidden' || d.type === 'submit' || d.type === 'button' || d.type === 'password') {
      return null;
    }
    for (const rule of RULES) {
      if (rule.test(d)) return rule.key;
    }
    return null;
  }

  /**
   * Resolve the string value for a matched field key from a user profile.
   * Splits full name into first/last when needed.
   */
  function valueForField(key, profile) {
    const p = profile || {};
    const nameParts = String(p.name || '').trim().split(/\s+/).filter(Boolean);
    switch (key) {
      case 'fullName':
        return p.name || '';
      case 'firstName':
        return nameParts[0] || '';
      case 'lastName':
        return nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
      case 'email':
        return p.email || '';
      case 'phone':
        return p.phone || '';
      case 'linkedin':
        return p.linkedin || '';
      case 'github':
        return p.github || '';
      case 'portfolio':
        return p.portfolio || p.github || '';
      case 'location':
        return p.location || '';
      case 'coverLetter':
        return p.coverLetter || '';
      default:
        return '';
    }
  }

  const api = { matchField, valueForField };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.HireFlowMatcher = api;
  }
})(typeof window !== 'undefined' ? window : this);
