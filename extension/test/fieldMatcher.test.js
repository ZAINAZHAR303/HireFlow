const test = require('node:test');
const assert = require('node:assert');
const { matchField, valueForField } = require('../lib/fieldMatcher');

const profile = {
  name: 'Jane Q Smith',
  email: 'jane@example.com',
  phone: '+1 555 111 2222',
  linkedin: 'https://linkedin.com/in/jane',
  github: 'https://github.com/jane',
  location: 'Berlin',
};

test('matches by input type and autocomplete', () => {
  assert.strictEqual(matchField({ type: 'email' }), 'email');
  assert.strictEqual(matchField({ type: 'tel' }), 'phone');
  assert.strictEqual(matchField({ autocomplete: 'given-name' }), 'firstName');
  assert.strictEqual(matchField({ autocomplete: 'family-name' }), 'lastName');
  assert.strictEqual(matchField({ autocomplete: 'name' }), 'fullName');
});

test('matches by keywords in name/id/label/placeholder', () => {
  assert.strictEqual(matchField({ name: 'first_name' }), 'firstName');
  assert.strictEqual(matchField({ id: 'last-name' }), 'lastName');
  assert.strictEqual(matchField({ label: 'Full Name' }), 'fullName');
  assert.strictEqual(matchField({ placeholder: 'Email address' }), 'email');
  assert.strictEqual(matchField({ label: 'LinkedIn Profile' }), 'linkedin');
  assert.strictEqual(matchField({ name: 'github_url' }), 'github');
  assert.strictEqual(matchField({ placeholder: 'Portfolio or website' }), 'portfolio');
  assert.strictEqual(matchField({ label: 'City' }), 'location');
});

test('does not treat company name as a name field', () => {
  assert.strictEqual(matchField({ label: 'Company Name' }), null);
  assert.strictEqual(matchField({ name: 'current_employer' }), null);
});

test('ignores hidden/submit/password inputs', () => {
  assert.strictEqual(matchField({ type: 'hidden', name: 'email' }), null);
  assert.strictEqual(matchField({ type: 'submit' }), null);
  assert.strictEqual(matchField({ type: 'password', name: 'password' }), null);
});

test('Greenhouse-style ids resolve correctly', () => {
  assert.strictEqual(matchField({ id: 'first_name', label: 'First Name *' }), 'firstName');
  assert.strictEqual(matchField({ id: 'last_name', label: 'Last Name *' }), 'lastName');
  assert.strictEqual(matchField({ id: 'email', type: 'text', label: 'Email *' }), 'email');
});

test('valueForField splits full name into first/last', () => {
  assert.strictEqual(valueForField('firstName', profile), 'Jane');
  assert.strictEqual(valueForField('lastName', profile), 'Q Smith');
  assert.strictEqual(valueForField('fullName', profile), 'Jane Q Smith');
  assert.strictEqual(valueForField('email', profile), 'jane@example.com');
  assert.strictEqual(valueForField('portfolio', { github: 'https://github.com/x' }), 'https://github.com/x');
});

test('cover letter / free-text prompts match', () => {
  assert.strictEqual(matchField({ label: 'Cover Letter' }), 'coverLetter');
  assert.strictEqual(matchField({ placeholder: 'Why do you want to work here?' }), 'coverLetter');
});
