const test = require('node:test');
const assert = require('node:assert');
const { buildOutreachPrompt, extractOutreachJson, fallbackOutreach } = require('../src/utils/outreachHelper');

const user = { name: 'Jane Smith', skills: ['React', 'TypeScript', 'Node.js'], linkedin: 'https://linkedin.com/in/jane' };
const job = { jobTitle: 'Frontend Engineer', companyName: 'Acme', jobDescription: 'Build UIs with React.' };

test('fallbackOutreach personalizes email + linkedin with real data', () => {
  const out = fallbackOutreach({ user, job, tone: 'professional' });
  assert.ok(out.email.subject.includes('Frontend Engineer'));
  assert.ok(out.email.subject.includes('Acme'));
  assert.ok(out.email.body.includes('Jane Smith')); // real name sign-off
  assert.ok(out.email.body.includes('React'));
  assert.ok(out.email.body.includes('https://linkedin.com/in/jane'));
  assert.ok(out.linkedin.body.includes('Jane')); // first name
  assert.ok(out.linkedin.body.length > 0);
});

test('fallbackOutreach handles a user with no skills gracefully', () => {
  const out = fallbackOutreach({ user: { name: 'Bob' }, job, tone: 'warm' });
  assert.ok(out.email.body.includes('Bob'));
  assert.ok(out.email.body.length > 50);
  assert.ok(!out.email.body.includes('undefined'));
});

test('buildOutreachPrompt includes role, company and skills, strips HTML', () => {
  const p = buildOutreachPrompt({ user, job: { ...job, jobDescription: '<p>Build <b>UIs</b></p>' }, tone: 'confident' });
  assert.ok(p.includes('Frontend Engineer'));
  assert.ok(p.includes('Acme'));
  assert.ok(p.includes('React'));
  assert.ok(p.includes('confident'));
  assert.ok(!p.includes('<p>') && !p.includes('<b>'));
});

test('buildOutreachPrompt falls back to professional tone for invalid tone', () => {
  const p = buildOutreachPrompt({ user, job, tone: 'aggressive' });
  assert.ok(p.includes('professional tone'));
});

test('extractOutreachJson parses fenced JSON', () => {
  const text = 'Here you go:\n```json\n{"email":{"subject":"s","body":"b"},"linkedin":{"body":"l"}}\n```';
  const parsed = extractOutreachJson(text);
  assert.strictEqual(parsed.email.subject, 's');
  assert.strictEqual(parsed.linkedin.body, 'l');
});

test('extractOutreachJson parses bare JSON object', () => {
  const parsed = extractOutreachJson('{"email":{"subject":"s","body":"b"},"linkedin":{"body":"l"}}');
  assert.strictEqual(parsed.email.body, 'b');
});

test('extractOutreachJson returns null for unusable or incomplete output', () => {
  assert.strictEqual(extractOutreachJson('no json here'), null);
  assert.strictEqual(extractOutreachJson('{"email":{"subject":"s"}}'), null); // missing linkedin
});
