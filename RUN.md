# Development Commands Reference

# 🏗️ BUILD & DEVELOPMENT
# Build TypeScript
cd functions && npm run build

# Watch for changes (recommended for development)
cd functions && npm run build:watch

# 🧪 LOCAL TESTING
# Start Firebase emulators (includes Functions, Firestore, Storage)
firebase emulators:start

# Start only functions emulator
firebase emulators:start --only functions

# Start with UI dashboard
firebase emulators:start --open-ui

# Alternative: Use npm script
cd functions && npm run serve

# 🔍 FUNCTION TESTING
# Interactive shell for testing functions
firebase functions:shell

# Run unit tests
cd functions && npm test

# Run tests in watch mode
cd functions && npm run test:watch

# Run tests with coverage
cd functions && npm run test:coverage

# 📊 MONITORING & LOGS
# View function logs (local)
firebase emulators:logs

# View production logs
firebase functions:log

# Stream logs in real-time
firebase functions:log --follow

# View specific function logs
firebase functions:log --only syncProductCatalog

# 🚀 DEPLOYMENT
# Deploy everything (rules, indexes, functions)
firebase deploy

# Deploy only functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:syncProductCatalog

# Deploy to specific project
firebase deploy --project production-project-id

# 🧹 MAINTENANCE
# Check function status
firebase functions:list

# Delete a function
firebase functions:delete functionName

# Update function configuration
firebase functions:config:set key=value

# 📈 PERFORMANCE
# Analyze bundle size
cd functions && npm run build && ls -la lib/

# Check for unused dependencies
cd functions && npm audit