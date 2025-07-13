// functions/test/utils.test.js
describe("Utility Functions", () => {
  test("Helper functions work", () => {
    // Test your helper functions
    const { Helpers } = require("../lib/utils/helpers");

    const chunks = Helpers.chunkArray([1, 2, 3, 4], 2);
    expect(chunks).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  test("Phone number formatting", () => {
    const { Helpers } = require("../lib/utils/helpers");

    const formatted = Helpers.sanitizePhoneNumber("0501234567");
    expect(formatted).toBe("233501234567");
  });
});
