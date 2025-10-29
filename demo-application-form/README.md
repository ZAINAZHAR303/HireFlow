# Demo Job Application Form

This is a mock job application form for testing the HireFlow auto-apply feature.

## How to Use

1. Open `index.html` in your browser (double-click the file)
2. The form will be available at a `file://` URL
3. Use this URL in the HireFlow "Auto-Apply" feature

## Form Fields

The form includes all common job application fields:
- Full Name
- Email
- Phone
- LinkedIn Profile
- Portfolio/GitHub
- Resume Upload (PDF)
- Cover Letter (textarea)

## For Testing

You can use this URL in the Auto-Apply modal:
```
file:///e:/Github%20Repos/hireflow/demo-application-form/index.html
```

Or serve it locally with:
```bash
npx serve .
```

Then use: `http://localhost:3000`

## Safety Features

- The automation will fill the form but NOT submit it automatically
- You can review all filled data before manual submission
- All actions are logged and screenshots are saved

## What the Automation Does

1. ✅ Opens browser and navigates to the form
2. ✅ Detects all form fields using AI heuristics
3. ✅ Fills in your personal information
4. ✅ Uploads resume (if file upload is detected)
5. ⚠️ Waits for you to review and manually submit

## Technologies

- Pure HTML/CSS/JavaScript
- No external dependencies
- Works with `file://` protocol
- localStorage for storing submissions
