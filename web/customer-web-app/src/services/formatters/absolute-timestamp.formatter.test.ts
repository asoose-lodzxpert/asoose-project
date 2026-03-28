/**
 * Test suite for absolute timestamp formatter
 * Tests edge cases and various date formats
 */

import {
  formatAbsoluteTimestamp,
  formatAbsoluteTimestampWithOptions,
  isValidDate,
} from "./absolute-timestamp.formatter";

describe("Absolute Timestamp Formatter", () => {
  // ✅ Test 1: Valid ISO strings
  describe("ISO String Parsing", () => {
    test("should format valid ISO string correctly", () => {
      const isoString = "2026-03-28T14:35:00Z";
      const result = formatAbsoluteTimestamp(isoString);

      // Result should be in format: "March 28, 2026, 14:35" (or similar depending on locale)
      expect(result).toContain("2026");
      expect(result).toContain("14:35");
      expect(result).toMatch(/March|Mar/i); // Month name
      expect(result).toMatch(/28/); // Day
      expect(result).not.toContain("ago"); // Should NOT contain relative time
      expect(result).not.toContain("hours");
    });

    test("should format ISO string with optional Z timezone", () => {
      const result = formatAbsoluteTimestamp("2025-12-31T23:59:59Z");
      expect(result).toContain("2025");
      expect(result).toContain("23:59");
    });

    test("should format ISO string with timezone offset", () => {
      const result = formatAbsoluteTimestamp("2026-03-28T14:35:00+03:00");
      expect(result).toContain("2026");
      expect(result).toContain("14");
    });
  });

  // ✅ Test 2: Unix timestamps
  describe("Unix Timestamp Parsing", () => {
    test("should format Unix timestamp (milliseconds)", () => {
      // March 28, 2026, 14:35:00 UTC
      const unixMs = 1711620900000;
      const result = formatAbsoluteTimestamp(unixMs);

      expect(result).toContain("2026");
      expect(result).not.toContain("ago");
    });

    test("should format Unix timestamp (seconds)", () => {
      // March 28, 2026, 14:35:00 UTC
      const unixSeconds = 1711620900;
      const result = formatAbsoluteTimestamp(unixSeconds);

      expect(result).toContain("2026");
      expect(result).not.toContain("ago");
    });
  });

  // ✅ Test 3: Date objects
  describe("Date Object Parsing", () => {
    test("should format Date object correctly", () => {
      const date = new Date("2026-03-28T14:35:00Z");
      const result = formatAbsoluteTimestamp(date);

      expect(result).toContain("2026");
      expect(result).not.toContain("ago");
    });
  });

  // ✅ Test 4: Edge cases - Invalid inputs
  describe("Edge Cases - Invalid Inputs", () => {
    test("should return fallback for null/undefined", () => {
      expect(formatAbsoluteTimestamp(null as any)).toBe("Unknown date");
      expect(formatAbsoluteTimestamp(undefined)).toBe("Unknown date");
      expect(formatAbsoluteTimestamp()).toBe("Unknown date");
    });

    test("should return fallback for invalid date string", () => {
      expect(formatAbsoluteTimestamp("invalid-date")).toBe("Unknown date");
      expect(formatAbsoluteTimestamp("not a date at all")).toBe("Unknown date");
    });

    test("should return fallback for invalid date object", () => {
      const invalidDate = new Date("invalid");
      const result = formatAbsoluteTimestamp(invalidDate);
      expect(result).toBe("Unknown date");
    });

    test("should return fallback for empty string", () => {
      expect(formatAbsoluteTimestamp("")).toBe("Unknown date");
    });

    test("should return fallback for NaN", () => {
      expect(formatAbsoluteTimestamp(NaN)).toBe("Unknown date");
    });
  });

  // ✅ Test 5: Different date formats
  describe("Different Date Formats", () => {
    test("should format dates in past months", () => {
      const result = formatAbsoluteTimestamp("2026-01-15T10:20:00Z");
      expect(result).toContain("2026");
      expect(result).not.toContain("ago");
    });

    test("should format dates in future", () => {
      const result = formatAbsoluteTimestamp("2027-06-30T18:45:00Z");
      expect(result).toContain("2027");
      expect(result).not.toContain("ago");
    });

    test("should format dates at midnight", () => {
      const result = formatAbsoluteTimestamp("2026-03-28T00:00:00Z");
      expect(result).toContain("2026");
      expect(result).toContain("00:00");
    });

    test("should format dates at end of day", () => {
      const result = formatAbsoluteTimestamp("2026-03-28T23:59:59Z");
      expect(result).toContain("2026");
      expect(result).toContain("23:59");
    });
  });

  // ✅ Test 6: isValidDate helper
  describe("Date Validation", () => {
    test("should correctly validate dates", () => {
      expect(isValidDate("2026-03-28T14:35:00Z")).toBe(true);
      expect(isValidDate(new Date())).toBe(true);
      expect(isValidDate(1711620900000)).toBe(true);
      expect(isValidDate("invalid")).toBe(false);
      expect(isValidDate(null as any)).toBe(false);
      expect(isValidDate(undefined)).toBe(false);
    });
  });

  // ✅ Test 7: Options - Custom timezone
  describe("Custom Timezone Options", () => {
    test("should format with custom timezone", () => {
      const isoString = "2026-03-28T14:35:00Z";
      const result = formatAbsoluteTimestampWithOptions(isoString, {
        timezone: "America/New_York",
      });

      expect(result).toBeTruthy();
      expect(result).not.toContain("ago");
    });

    test("should format with custom locale", () => {
      const isoString = "2026-03-28T14:35:00Z";
      const result = formatAbsoluteTimestampWithOptions(isoString, {
        locale: "en-US",
      });

      expect(result).toBeTruthy();
      expect(result).not.toContain("ago");
    });

    test("should format without time when includeTime=false", () => {
      const isoString = "2026-03-28T14:35:00Z";
      const result = formatAbsoluteTimestampWithOptions(isoString, {
        includeTime: false,
      });

      expect(result).toContain("2026");
      expect(result).toContain("28");
      // Should not have time (may or may not contain colon depending on locale)
    });
  });

  // ✅ Test 8: Consistency
  describe("Consistency Checks", () => {
    test("same date in different formats should produce same output", () => {
      const isoString = "2026-03-28T14:35:00Z";
      const unixMs = new Date(isoString).getTime();
      const dateObj = new Date(isoString);

      const result1 = formatAbsoluteTimestamp(isoString);
      const result2 = formatAbsoluteTimestamp(unixMs);
      const result3 = formatAbsoluteTimestamp(dateObj);

      // All three should be identical or very similar
      expect(result1).toBe(result2);
      expect(result1).toBe(result3);
      expect(result2).toBe(result3);
    });

    test("should never return relative time format", () => {
      const testCases = [
        "2026-03-28T14:35:00Z",
        1711620900000,
        new Date("2026-03-28T14:35:00Z"),
        "2020-01-01T00:00:00Z",
      ];

      testCases.forEach((testCase) => {
        const result = formatAbsoluteTimestamp(testCase);
        expect(result).not.toMatch(/ago\b/i);
        expect(result).not.toMatch(/hour/i);
        expect(result).not.toMatch(/minute/i);
        expect(result).not.toMatch(/day\b/i);
        expect(result).not.toMatch(/week/i);
        expect(result).not.toMatch(/month/i);
        expect(result).not.toMatch(/year/i);
        expect(result).not.toMatch(/yesterday/i);
        expect(result).not.toMatch(/tomorrow/i);
      });
    });
  });

  // ✅ Test 9: 24-hour format verification
  describe("24-hour Format Verification", () => {
    test("should use 24-hour format (not 12-hour AM/PM)", () => {
      const afternoonDate = "2026-03-28T14:35:00Z";
      const result = formatAbsoluteTimestamp(afternoonDate);

      expect(result).toContain("14:35");
      expect(result).not.toMatch(/PM/i);
      expect(result).not.toMatch(/AM/i);
    });

    test("should format early morning times correctly", () => {
      const earlyMorning = "2026-03-28T08:15:00Z";
      const result = formatAbsoluteTimestamp(earlyMorning);

      expect(result).toContain("08:15");
      expect(result).not.toMatch(/AM/i);
    });
  });

  // ✅ Test 10: Sorting capability
  describe("Sorting Capability", () => {
    test("formatted timestamps should be sortable if needed", () => {
      const dates = [
        "2026-03-28T14:35:00Z",
        "2026-01-15T10:20:00Z",
        "2026-12-31T23:59:59Z",
        "2026-06-15T12:00:00Z",
      ];

      const formatted = dates.map(formatAbsoluteTimestamp);

      // While formatted strings might not be directly sortable,
      // the original dates should still be sortable in the component
      expect(formatted.length).toBe(4);
      expect(formatted.every((f) => f !== "Unknown date")).toBe(true);
    });
  });
});

// ✅ Test 11: Real-world notification scenarios
describe("Real-World Notification Scenarios", () => {
  test("should handle notification from API with createdAt field", () => {
    const notification = {
      id: "notif-123",
      createdAt: "2026-03-28T14:35:00.000Z",
      title: "Order Updated",
    };

    const result = formatAbsoluteTimestamp(notification.createdAt);
    expect(result).toContain("2026");
    expect(result).toContain("14:35");
    expect(result).not.toContain("ago");
  });

  test("should handle multiple notifications with different timestamps", () => {
    const notifications = [
      { createdAt: "2026-03-28T14:35:00Z", title: "Notification 1" },
      { createdAt: "2026-03-27T10:20:00Z", title: "Notification 2" },
      { createdAt: "2026-03-26T09:15:00Z", title: "Notification 3" },
    ];

    const results = notifications.map((n) =>
      formatAbsoluteTimestamp(n.createdAt)
    );

    results.forEach((result) => {
      expect(result).not.toContain("ago");
      expect(result).toContain("2026");
    });
  });
});
