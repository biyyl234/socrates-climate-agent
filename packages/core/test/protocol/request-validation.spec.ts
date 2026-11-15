import { describe, expect, it } from "vitest";
import { validateChatRequest } from "../../src/protocol";

describe("chat request validation (R11)", () => {
  it("accepts a valid request", () => {
    const result = validateChatRequest({
      message: "牛肉饭和素菜饭哪个低碳",
      locale: "zh-CN",
      mode: "assisted",
      context: { entry_scene: "canteen" },
    });
    expect(result.ok).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("rejects an empty message", () => {
    expect(validateChatRequest({ message: "" }).ok).toBe(false);
    expect(validateChatRequest({}).ok).toBe(false);
  });

  it("rejects a message longer than 1000 characters", () => {
    const tooLong = "这是一段超长输入。".repeat(120);
    const result = validateChatRequest({ message: tooLong });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("INVALID_PAYLOAD");
    expect(result.issues.some((i) => i.field === "message" && /1000/.test(i.reason))).toBe(true);
  });

  it("rejects an unknown mode and non-object context", () => {
    expect(validateChatRequest({ message: "hi", mode: "ghost" }).ok).toBe(false);
    expect(validateChatRequest({ message: "hi", context: "nope" }).ok).toBe(false);
  });
});
