import { describe, expect, it } from "vitest";
import { detectAutoReply } from "./autoReplyDetector";

describe("detectAutoReply", () => {
  it("matches a pattern as a case-insensitive substring", () => {
    expect(detectAutoReply("I'm currently OUT OF OFFICE, back Monday", ["out of office"])).toBe(true);
  });

  it("matches when the pattern is a different case than the configured one", () => {
    expect(detectAutoReply("Away From Desk until further notice", ["away from desk"])).toBe(true);
  });

  it("matches against any one of several configured patterns", () => {
    const patterns = ["out of office", "on vacation", "auto-reply"];
    expect(detectAutoReply("This is an auto-reply to your message", patterns)).toBe(true);
  });

  it("returns false when no pattern matches", () => {
    expect(detectAutoReply("Sure, sounds good, see you then!", ["out of office", "on vacation"])).toBe(false);
  });

  it("returns false for an empty pattern list, regardless of content", () => {
    expect(detectAutoReply("out of office", [])).toBe(false);
  });

  it("never matches an empty/whitespace-only configured pattern", () => {
    expect(detectAutoReply("anything at all", ["", "   "])).toBe(false);
  });

  it("returns false for empty message text", () => {
    expect(detectAutoReply("", ["out of office"])).toBe(false);
  });
});
