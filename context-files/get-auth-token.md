# How to Get Your Auth Token

## 🔑 Method 1: Browser Developer Tools

1. **Login to the app** at `http://localhost:5000`
2. **Open Developer Tools** (F12 or Right-click > Inspect)
3. **Go to Application tab** (Chrome) or **Storage tab** (Firefox)
4. **Navigate to Cookies** > `http://localhost:5000`
5. **Find "auth-token"** cookie
6. **Copy the Value** (long string starting with `eyJ...`)

## 🖱️ Method 2: Browser Console (Copy & Paste)

1. **Login to the app** at `http://localhost:5000`
2. **Open Developer Tools Console** (F12 > Console tab)
3. **Paste this code** and press Enter:

```javascript
// Extract auth token from cookies
const authToken = document.cookie
  .split('; ')
  .find(row => row.startsWith('auth-token='))
  ?.split('=')[1];

if (authToken) {
  console.log('🔑 Your auth token:');
  console.log(authToken);
  console.log('\n📋 Copy this token and use it with the test script:');
  console.log(`node test-maestro-template.js 0af4dd2b-582d-4aaf-84b5-f1979216c266 "${authToken}"`);
} else {
  console.log('❌ No auth token found. Please make sure you are logged in.');
}
```

4. **Copy the token** from the console output

## 🚀 Method 3: Using the Test Script

Once you have your token, run:

```bash
node test-maestro-template.js 0af4dd2b-582d-4aaf-84b5-f1979216c266 "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

Replace the `eyJ...` part with your actual token.

## ⚠️ Important Notes

- **Auth tokens expire** after 7 days, so you may need to get a new one
- **Keep tokens secure** - don't share them or commit them to git
- **Tokens are httpOnly cookies** so they're not accessible via JavaScript in production, but this console method works for testing

## 🔄 If Token Expires

If you get a 401 error, your token has expired:

1. **Logout and login again** in the browser
2. **Get a new token** using the methods above
3. **Run the script again** with the new token

## 🎯 Expected Success Output

When it works, you should see:

```
🔍 Testing Maestro template extraction for session: 0af4dd2b-582d-4aaf-84b5-f1979216c266
🔑 Using provided auth token: eyJhbGciOiJIUzI1NiIsIn...
📊 Step 1: Fetching session data...
✅ Session data loaded successfully
   Title: Your Project Title
   Engineer: Your Name
   Solutions: 2
🎯 Step 2: Extracting HTML template...
✅ HTML template extracted successfully
   Template length: 206,491 characters
📝 Step 4: Generating report...
✅ Report generated successfully!
📁 Output file: maestro-template-0af4dd2b-582d-4aaf-84b5-f1979216c266-1234567890.md
```

