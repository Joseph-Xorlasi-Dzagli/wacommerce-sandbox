# 🧪 Basic Testing Guide

## 🚀 Quick Setup

### 1. Install Testing Dependencies
```bash
cd functions
npm install --save-dev jest @types/jest ts-jest
```

### 2. Create Basic Test Structure
```bash
mkdir functions/test
touch functions/test/basic.test.js
```

### 3. Add Test Script to package.json
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch"
  }
}
```

---

## 🔧 Basic Tests

### Test 1: Simple Function Test
```javascript
// functions/test/basic.test.js
const { initializeApp } = require('firebase-admin/app');

// Initialize Firebase for testing
if (!require('firebase-admin').apps.length) {
  initializeApp({ projectId: 'test-project' });
}

describe('Basic Function Tests', () => {
  test('Firebase initializes correctly', () => {
    expect(true).toBe(true); // Simple test to start
  });

  test('Environment variables work', () => {
    process.env.TEST_VAR = 'test-value';
    expect(process.env.TEST_VAR).toBe('test-value');
  });
});
```

### Test 2: Test Your Utilities
```javascript
// functions/test/utils.test.js
describe('Utility Functions', () => {
  test('Helper functions work', () => {
    // Test your helper functions
    const { Helpers } = require('../lib/utils/helpers');
    
    const chunks = Helpers.chunkArray([1, 2, 3, 4], 2);
    expect(chunks).toEqual([[1, 2], [3, 4]]);
  });

  test('Phone number formatting', () => {
    const { Helpers } = require('../lib/utils/helpers');
    
    const formatted = Helpers.sanitizePhoneNumber('0501234567');
    expect(formatted).toBe('233501234567');
  });
});
```

---

## 🧪 Testing Your Functions

### Method 1: Using Firebase Emulator (Recommended)

```bash
# 1. Start emulators
firebase emulators:start

# 2. In another terminal, test functions
firebase functions:shell
```

In the Firebase shell:
```javascript
// Test your functions directly
helloWorld({message: "test"})
syncProductCatalog({businessId: "test-123", syncType: "full"})
```

### Method 2: HTTP Testing

```bash
# Test webhook endpoint
curl -X GET "http://localhost:5001/your-project/us-central1/whatsappWebhook?hub.mode=subscribe&hub.verify_token=test&hub.challenge=test123"

# Test with POST data
curl -X POST "http://localhost:5001/your-project/us-central1/whatsappWebhook" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

### Method 3: Frontend Testing

```html
<!DOCTYPE html>
<html>
<head>
    <script src="https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.0.0/firebase-functions.js"></script>
</head>
<body>
    <button onclick="testFunction()">Test Function</button>
    
    <script>
        // Your Firebase config
        const firebaseConfig = { /* your config */ };
        firebase.initializeApp(firebaseConfig);
        
        const functions = firebase.functions();
        
        // Connect to emulator for local testing
        if (location.hostname === 'localhost') {
            functions.useEmulator('localhost', 5001);
        }
        
        async function testFunction() {
            try {
                const result = await functions.httpsCallable('helloWorld')({
                    message: 'Hello from web!'
                });
                console.log('Result:', result.data);
                alert(JSON.stringify(result.data, null, 2));
            } catch (error) {
                console.error('Error:', error);
                alert('Error: ' + error.message);
            }
        }
    </script>
</body>
</html>
```

---

## ✅ Quick Verification Checklist

### Before Testing:
- [ ] Functions build successfully: `npm run build`
- [ ] No TypeScript errors: `npm run lint`
- [ ] Dependencies installed: `npm install`
- [ ] Emulators start: `firebase emulators:start`

### Basic Tests:
- [ ] `helloWorld` function responds
- [ ] Webhook GET returns challenge
- [ ] Webhook POST accepts data
- [ ] Functions appear in emulator UI (http://localhost:4000)

### Function-Specific Tests:
- [ ] `syncProductCatalog` - with test business ID
- [ ] `uploadProductMedia` - with test image URL
- [ ] `sendOrderNotification` - with test order ID

---

## 🚨 Common Issues & Quick Fixes

### Issue: "Function not found"
```bash
# Make sure functions are built
cd functions
npm run build

# Check if function is exported in index.ts
grep "export" src/index.ts
```

### Issue: "Auth required" error
```javascript
// Add auth context in Firebase shell
// Use: firebase functions:shell --project your-project-id

// Then test with user context:
syncProductCatalog.call({ auth: { uid: 'test-user' } }, { businessId: 'test' })
```

### Issue: "Module not found"
```bash
# Install missing dependencies
cd functions
npm install

# Rebuild
npm run build
```

### Issue: "Emulator won't start"
```bash
# Kill any existing processes
npx kill-port 5001
npx kill-port 4000

# Restart
firebase emulators:start
```

---

## 🏃‍♂️ Quick Test Commands

```bash
# Run all tests
npm test

# Run tests in watch mode (reruns on file changes)
npm run test:watch

# Build and test
npm run build && npm test

# Start emulator and test specific function
firebase emulators:start &
sleep 5
firebase functions:shell --non-interactive < test-commands.txt
```

Create `test-commands.txt`:
```
helloWorld({test: "data"})
.exit
```

---

## 📋 Simple Test Scenarios

### Test 1: Basic Function Call
```javascript
// In Firebase shell or your test
helloWorld({message: "Hello World"})

// Expected result:
{
  success: true,
  message: "Hello from WhatsApp Commerce Functions!",
  timestamp: "2024-01-01T12:00:00.000Z",
  userId: "anonymous"
}
```

### Test 2: Webhook Verification
```bash
curl "http://localhost:5001/your-project/us-central1/whatsappWebhook?hub.mode=subscribe&hub.verify_token=test-token&hub.challenge=my-challenge"

# Expected: "my-challenge"
```

### Test 3: Catalog Sync (Mock)
```javascript
// Create test business data first, then:
syncProductCatalog({
  businessId: "test-business-123",
  syncType: "full"
})

// Expected: Success response with sync counts
```

---

## 🎯 Testing Best Practices

1. **Start Simple** - Test basic functions first
2. **Use Real Data** - Create test businesses/products in Firestore
3. **Test Incrementally** - Add one feature at a time
4. **Check Logs** - Watch emulator logs for errors
5. **Mock External APIs** - Don't call real WhatsApp API in tests

---

## 🔍 Debug Mode

Enable detailed logging:
```bash
# Set debug environment
export DEBUG=*

# Start emulators with debug
firebase emulators:start --debug

# Watch function logs
firebase functions:log --follow
```

---

This basic guide gets you started with testing quickly. Once these basics work, you can expand to more complex testing scenarios! 🚀