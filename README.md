# 🚀 WhatsApp Commerce Cloud Functions

A production-ready, modular implementation of WhatsApp Business API integration for eCommerce platforms. This project provides comprehensive catalog synchronization, media management, order notifications, and real-time inventory updates through WhatsApp Business API.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)
![Firebase](https://img.shields.io/badge/firebase-functions-orange.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.0+-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Prerequisites](#-prerequisites)
- [Quick Start](#-quick-start)
- [Configuration](#-configuration)
- [API Reference](#-api-reference)
- [Usage Examples](#-usage-examples)
- [Development](#-development)
- [Deployment](#-deployment)
- [Monitoring](#-monitoring)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

### 🛍️ **Catalog Management**
- **Full Catalog Sync**: Synchronize entire product catalogs to WhatsApp Business
- **Incremental Updates**: Efficient sync of only changed products
- **Real-time Inventory**: Automatic stock level and pricing updates
- **Media Optimization**: Automatic image optimization for WhatsApp
- **Batch Processing**: Handle large catalogs with intelligent batching

### 📱 **WhatsApp Integration**
- **Business API**: Full WhatsApp Business API integration
- **Media Management**: Upload, optimize, and manage product images
- **Message Templates**: Support for custom notification templates
- **Webhook Handling**: Secure webhook processing for delivery status
- **Multi-Business**: Support for multiple businesses with data isolation

### 🔔 **Order Notifications**
- **Automated Messaging**: Send order updates via WhatsApp
- **Delivery Tracking**: Real-time delivery status updates
- **Payment Reminders**: Automated payment reminder sequences
- **Custom Messages**: Support for personalized messaging
- **Analytics**: Track message delivery and engagement

### 🔒 **Security & Performance**
- **Business Isolation**: Secure multi-tenant architecture
- **Encrypted Credentials**: Secure storage of API tokens
- **Rate Limiting**: Built-in API rate limiting and retry logic
- **Comprehensive Logging**: Detailed audit trails and monitoring
- **Health Monitoring**: Automated system health checks

### 📊 **Analytics & Monitoring**
- **Performance Metrics**: Function execution and success rates
- **Business Analytics**: Customer engagement and conversion tracking
- **Error Tracking**: Comprehensive error logging and alerting
- **System Health**: Automated health checks and maintenance

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    WhatsApp Commerce Functions              │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Catalog   │  │    Media    │  │Notifications│         │
│  │   Handler   │  │   Handler   │  │   Handler   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │    Auth     │  │  WhatsApp   │  │    Media    │         │
│  │   Service   │  │   Service   │  │   Service   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Validation  │  │ Encryption  │  │   Logger    │         │
│  │   Utils     │  │    Utils    │  │    Utils    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      Firebase Services                     │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Firestore  │  │   Storage   │  │  Functions  │         │
│  │  Database   │  │   Bucket    │  │   Runtime   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                 WhatsApp Business API                      │
└─────────────────────────────────────────────────────────────┘
```

### **Modular Design Principles**

- **Services Layer**: Business logic and external API integration
- **Handlers Layer**: Function-specific request orchestration
- **Utils Layer**: Shared utilities and common functionality
- **Types Layer**: TypeScript interfaces and type definitions

## 📋 Prerequisites

Before getting started, ensure you have:

### **Development Environment**
- **Node.js** v18.0.0 or higher
- **npm** v8.0.0 or higher
- **Git** for version control
- **Firebase CLI** v12.0.0 or higher

### **Firebase Project**
- Active Firebase project with Blaze plan
- Firestore database enabled
- Cloud Functions enabled
- Cloud Storage enabled

### **WhatsApp Business API**
- Meta Business Account
- WhatsApp Business API access
- Verified business phone number
- App ID and App Secret from Meta

### **External Services**
- OpenSSL for encryption key generation
- Sharp for image processing (auto-installed)

## 🚀 Quick Start

### **1. Project Initialization**

```bash
# Clone the repository
git clone https://github.com/your-username/whatsapp-commerce-functions.git
cd whatsapp-commerce-functions

# Initialize Firebase project
firebase login
firebase init

# Install dependencies and setup environment
npm run setup:complete
```

### **2. Environment Configuration**

```bash
# Configure environment variables
npm run set-config

# Verify setup
npm run verify
```

### **3. Deploy to Firebase**

```bash
# Deploy everything (rules, indexes, functions)
npm run deploy

# Or deploy components separately
npm run deploy:rules      # Deploy Firestore rules and indexes
npm run deploy:functions  # Deploy Cloud Functions only
```

### **4. Initialize WhatsApp for Business**

```javascript
// Initialize WhatsApp integration for a business
const result = await firebase.functions().httpsCallable('initializeWhatsAppConfig')({
  businessId: 'your-business-id',
  phoneNumberId: 'your-whatsapp-phone-number-id',
  businessAccountId: 'your-whatsapp-business-account-id',
  accessToken: 'your-whatsapp-access-token',
  verifyToken: 'your-webhook-verify-token'
});

console.log('WhatsApp initialized:', result.data);
```

## ⚙️ Configuration

### **Environment Variables**

Configure the following environment variables using Firebase Functions config:

```bash
# Required configurations
firebase functions:config:set \
  whatsapp.webhook_secret="your_secure_webhook_secret" \
  encryption.key="your_32_character_encryption_key" \
  storage.bucket="your_firebase_storage_bucket"

# Optional configurations
firebase functions:config:set \
  app.environment="production" \
  logging.level="info" \
  whatsapp.api_version="v18.0"
```

### **WhatsApp Business API Setup**

1. **Create Meta Business Account**
   - Go to [Meta Business](https://business.facebook.com/)
   - Create or select your business account

2. **Set up WhatsApp Business API**
   - Navigate to WhatsApp Business API in Meta Business
   - Add your phone number and verify
   - Generate access tokens

3. **Configure Webhook**
   - Set webhook URL: `https://your-region-your-project.cloudfunctions.net/handleNotificationDeliveryStatus`
   - Use the webhook secret from your configuration
   - Subscribe to message events

### **Firebase Project Configuration**

```json
{
  "functions": {
    "memory": "1GB",
    "timeout": "540s",
    "region": "us-central1"
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  }
}
```

## 📚 API Reference

### **Catalog Management Functions**

#### `syncProductCatalog`
Synchronizes products from Firestore to WhatsApp Business Catalog.

```javascript
const result = await firebase.functions().httpsCallable('syncProductCatalog')({
  businessId: 'business123',
  syncType: 'full', // 'full' | 'incremental' | 'specific'
  productIds: ['product1', 'product2'], // Optional: for specific sync
  includeCategories: true
});
```

**Response:**
```javascript
{
  success: true,
  syncedProducts: 150,
  failedProducts: 2,
  errors: [
    { productId: 'product456', error: 'Invalid image URL' }
  ]
}
```

#### `updateProductInCatalog`
Updates specific fields of a product in WhatsApp catalog.

```javascript
const result = await firebase.functions().httpsCallable('updateProductInCatalog')({
  businessId: 'business123',
  productId: 'product456',
  updateFields: ['name', 'price', 'availability']
});
```

#### `syncInventoryToCatalog`
Synchronizes inventory levels and pricing to WhatsApp catalog.

```javascript
const result = await firebase.functions().httpsCallable('syncInventoryToCatalog')({
  businessId: 'business123',
  productIds: ['product1', 'product2'], // Optional
  updatePrices: true
});
```

### **Media Management Functions**

#### `uploadMediaToWhatsApp`
Uploads and optimizes images for WhatsApp Business API.

```javascript
const result = await firebase.functions().httpsCallable('uploadMediaToWhatsApp')({
  businessId: 'business123',
  imageUrl: 'https://example.com/product-image.jpg',
  purpose: 'product', // 'product' | 'category' | 'carousel' | 'fallback'
  referenceId: 'product456',
  referenceType: 'products'
});
```

#### `batchUploadProductMedia`
Uploads multiple product images in batches.

```javascript
const result = await firebase.functions().httpsCallable('batchUploadProductMedia')({
  businessId: 'business123',
  productIds: ['product1', 'product2', 'product3']
});
```

### **Notification Functions**

#### `sendOrderNotification`
Sends order updates via WhatsApp.

```javascript
const result = await firebase.functions().httpsCallable('sendOrderNotification')({
  businessId: 'business123',
  orderId: 'order789',
  notificationType: 'status_change', // 'status_change' | 'payment_received' | 'shipping_update'
  customMessage: 'Your order is ready for pickup!' // Optional
});
```

### **Utility Functions**

#### `getCatalogSyncStatus`
Retrieves catalog synchronization status and health metrics.

```javascript
const result = await firebase.functions().httpsCallable('getCatalogSyncStatus')({
  businessId: 'business123',
  includeDetails: true
});
```

## 💼 Usage Examples

### **Complete Business Setup Workflow**

```javascript
// 1. Initialize WhatsApp for business
const initResult = await firebase.functions().httpsCallable('initializeWhatsAppConfig')({
  businessId: 'electronics-store-123',
  phoneNumberId: 'your-phone-number-id',
  businessAccountId: 'your-business-account-id',
  accessToken: 'your-access-token',
  verifyToken: 'your-verify-token'
});

// 2. Upload product images
const mediaResult = await firebase.functions().httpsCallable('batchUploadProductMedia')({
  businessId: 'electronics-store-123',
  productIds: ['phone1', 'phone2', 'laptop1']
});

// 3. Sync entire catalog
const syncResult = await firebase.functions().httpsCallable('syncProductCatalog')({
  businessId: 'electronics-store-123',
  syncType: 'full',
  includeCategories: true
});

// 4. Enable order notifications
const notificationResult = await firebase.functions().httpsCallable('sendOrderNotification')({
  businessId: 'electronics-store-123',
  orderId: 'order-001',
  notificationType: 'status_change'
});

console.log('Business setup complete!');
```

### **Daily Operations Workflow**

```javascript
// Morning: Sync inventory updates
const inventorySync = await firebase.functions().httpsCallable('syncInventoryToCatalog')({
  businessId: 'electronics-store-123',
  updatePrices: true
});

// Process new orders throughout the day
const orderUpdate = await firebase.functions().httpsCallable('sendOrderNotification')({
  businessId: 'electronics-store-123',
  orderId: 'order-002',
  notificationType: 'payment_received'
});

// Evening: Clean up expired media
const cleanup = await firebase.functions().httpsCallable('cleanupUnusedMedia')({
  businessId: 'electronics-store-123',
  olderThanDays: 30
});
```

### **Error Handling and Monitoring**

```javascript
try {
  const result = await firebase.functions().httpsCallable('syncProductCatalog')({
    businessId: 'electronics-store-123',
    syncType: 'incremental'
  });
  
  if (result.data.success) {
    console.log(`Synced ${result.data.syncedProducts} products successfully`);
    
    // Handle partial failures
    if (result.data.failedProducts > 0) {
      console.warn('Some products failed to sync:', result.data.errors);
      // Implement retry logic or alert administrators
    }
  }
} catch (error) {
  console.error('Sync failed:', error);
  // Implement error reporting and fallback procedures
}
```

## 🔧 Development

### **Local Development Setup**

```bash
# Install dependencies
npm install
cd functions && npm install && cd ..

# Start Firebase emulators
npm run serve

# Access emulator UI
open http://localhost:4000
```

### **Project Structure**

```
src/
├── config/
│   ├── constants.ts         # Application constants
│   └── environment.ts       # Environment configuration
├── types/
│   ├── requests.ts          # Request interfaces
│   ├── responses.ts         # Response interfaces
│   └── entities.ts          # Data model types
├── utils/
│   ├── validation.ts        # Input validation
│   ├── encryption.ts        # Encryption utilities
│   ├── logger.ts           # Logging utilities
│   └── helpers.ts          # Common helper functions
├── services/
│   ├── auth.service.ts      # Authentication logic
│   ├── whatsapp.service.ts  # WhatsApp API integration
│   ├── media.service.ts     # Media processing
│   └── notification.service.ts # Notification logic
├── handlers/
│   ├── catalog.handler.ts   # Catalog operations
│   ├── media.handler.ts     # Media operations
│   └── notification.handler.ts # Notification operations
└── index.ts                 # Function exports
```

### **Development Commands**

```bash
# Build TypeScript
npm run build

# Watch for changes
npm run build:watch

# Run tests
npm run test

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# View function logs
npm run logs

# Test specific function
firebase functions:shell
```

### **Testing**

```bash
# Run all tests
npm run test

# Run specific test suite
npm run test -- --grep "CatalogHandler"

# Run tests with coverage
npm run test:coverage

# Test Firestore rules
npm run test:rules
```

### **Code Quality**

The project uses ESLint and TypeScript for code quality:

```bash
# Check code style
npm run lint

# Auto-fix issues
npm run lint:fix

# Type checking
npm run type-check
```

## 🚢 Deployment

### **Production Deployment**

```bash
# Build and deploy everything
npm run deploy

# Deploy specific components
npm run deploy:functions  # Functions only
npm run deploy:rules     # Rules and indexes only

# Deploy to specific Firebase project
npm run deploy production-project-id
```

### **Staging Deployment**

```bash
# Deploy to staging environment
firebase use staging
npm run deploy

# Run smoke tests
npm run test:staging
```

### **Environment-Specific Configuration**

```bash
# Set environment-specific config
firebase use production
firebase functions:config:set app.environment="production"

firebase use staging  
firebase functions:config:set app.environment="staging"
```

### **Rollback Procedures**

```bash
# List recent deployments
firebase functions:log

# Rollback to previous version
firebase functions:delete functionName
# Then redeploy previous version
```

## 📊 Monitoring

### **Built-in Health Monitoring**

The system includes automated health checks that run every hour:

- **Media Expiration**: Monitors for expiring WhatsApp media
- **Failed Notifications**: Tracks notification delivery failures
- **Sync Errors**: Monitors catalog synchronization issues
- **System Performance**: Tracks function execution metrics

### **Accessing Monitoring Data**

```javascript
// View system health
const health = await firebase.functions().httpsCallable('systemHealthCheck')();

// Business-specific analytics
const analytics = await firebase.functions().httpsCallable('generateBusinessAnalytics')({
  businessId: 'business123',
  dateRange: {
    start: new Date('2024-01-01'),
    end: new Date('2024-01-31')
  },
  metrics: ['messages', 'orders', 'products', 'notifications']
});
```

### **Firebase Console Monitoring**

Monitor your functions through Firebase Console:

1. **Function Metrics**: Execution count, duration, memory usage
2. **Error Reporting**: Automatic error detection and alerting
3. **Logs**: Structured logs with filtering and search
4. **Performance**: Function cold starts and warm-up times

### **Custom Alerting**

Set up custom alerts for:

```bash
# High error rates
gcloud alpha monitoring policies create \
  --policy-from-file=alerting/high-error-rate.yaml

# Function timeouts
gcloud alpha monitoring policies create \
  --policy-from-file=alerting/function-timeouts.yaml
```

## 🐛 Troubleshooting

### **Common Issues**

#### **1. Function Deployment Failures**

```bash
# Check function size
firebase functions:log --only=deploymentError

# Common solutions:
# - Reduce memory usage
# - Optimize dependencies
# - Split large functions
```

#### **2. WhatsApp API Errors**

```bash
# Check API credentials
firebase functions:config:get

# Common issues:
# - Expired access tokens
# - Invalid webhook configuration
# - Rate limit exceeded
```

#### **3. Media Upload Failures**

```bash
# Check image accessibility
curl -I https://your-image-url.com/image.jpg

# Common issues:
# - Image too large (>16MB)
# - Invalid image format
# - Network connectivity
```

#### **4. Firestore Permission Errors**

```bash
# Test Firestore rules
firebase emulators:start --only firestore
# Use Rules Playground in Firebase Console
```

### **Debug Commands**

```bash
# View detailed function logs
firebase functions:log --only syncProductCatalog

# Check function configuration
firebase functions:config:get

# Test function locally
firebase functions:shell

# Verify Firestore connection
npm run verify
```

### **Performance Optimization**

#### **Function Memory Optimization**

```typescript
// Adjust memory allocation based on function needs
export const heavyFunction = functions
  .runWith({ memory: '2GB', timeoutSeconds: 540 })
  .https.onCall(async (data, context) => {
    // Heavy processing logic
  });
```

#### **Batch Processing Optimization**

```typescript
// Optimize batch sizes for better performance
const OPTIMAL_BATCH_SIZE = 10; // For WhatsApp API
const batches = chunkArray(items, OPTIMAL_BATCH_SIZE);

for (const batch of batches) {
  await processBatch(batch);
  // Add delay between batches if needed
  await new Promise(resolve => setTimeout(resolve, 100));
}
```

### **Error Recovery Procedures**

#### **1. Failed Catalog Sync**

```javascript
// Check sync status
const status = await getCatalogSyncStatus({
  businessId: 'business123',
  includeDetails: true
});

// Retry failed products
const retryResult = await syncProductCatalog({
  businessId: 'business123',
  syncType: 'specific',
  productIds: status.failedProducts.map(p => p.id)
});
```

#### **2. Media Recovery**

```javascript
// Refresh expired media
const refreshResult = await refreshExpiredMedia({
  businessId: 'business123',
  bufferDays: 7
});

// Clean up orphaned media
const cleanupResult = await cleanupUnusedMedia({
  businessId: 'business123',
  olderThanDays: 30
});
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### **Development Workflow**

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**
4. **Add tests** for new functionality
5. **Run tests**: `npm run test`
6. **Commit changes**: `git commit -m 'Add amazing feature'`
7. **Push to branch**: `git push origin feature/amazing-feature`
8. **Open a Pull Request**

### **Code Standards**

- **TypeScript**: Use strict type checking
- **ESLint**: Follow project linting rules
- **Testing**: Maintain test coverage above 80%
- **Documentation**: Update docs for new features
- **Commit Messages**: Use conventional commit format

### **Pull Request Process**

1. Ensure tests pass and coverage is maintained
2. Update documentation for any new features
3. Add entries to CHANGELOG.md
4. Request review from project maintainers
5. Address review feedback promptly

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Firebase Team** for the excellent cloud platform
- **WhatsApp Business API** for enabling business messaging
- **Sharp** for image processing capabilities
- **TypeScript** for type safety and developer experience

## 📞 Support

- **Documentation**: [docs.whatsapp-commerce.com](https://docs.whatsapp-commerce.com)
- **Issues**: [GitHub Issues](https://github.com/your-username/whatsapp-commerce-functions/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/whatsapp-commerce-functions/discussions)
- **Email**: support@whatsapp-commerce.com

---

**Built with ❤️ for the eCommerce community**

*WhatsApp Commerce Functions - Bringing businesses closer to their customers through WhatsApp.*
