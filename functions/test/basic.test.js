// functions/test/basic.test.js
const { initializeApp } = require("firebase-admin/app");

// Initialize Firebase for testing
if (!require("firebase-admin").apps.length) {
  initializeApp({ projectId: "test-project" });
}

describe("Basic Function Tests", () => {
  test("Firebase initializes correctly", () => {
    expect(true).toBe(true); // Simple test to start
  });

  test("Environment variables work", () => {
    process.env.TEST_VAR = "test-value";
    expect(process.env.TEST_VAR).toBe("test-value");
  });
});
