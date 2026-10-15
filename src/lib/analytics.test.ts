import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setUserId, track } from "./analytics";

const PII_KEYS = ["phone", "email", "name", "telefone"];

describe("analytics", () => {
  beforeEach(() => {
    (globalThis as { window?: unknown }).window = { dataLayer: [] };
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  function dataLayer(): Record<string, unknown>[] {
    return (globalThis as unknown as { window: Window }).window.dataLayer;
  }

  it("pushes GA4 events flat, without category or label", () => {
    track("sign_up", { method: "phone" });
    expect(dataLayer()).toEqual([{ event: "sign_up", method: "phone" }]);
  });

  it("pushes begin_checkout with plan, value and currency", () => {
    track("begin_checkout", { plan: "annual", value: 262.8, currency: "BRL" });
    expect(dataLayer()[0]).toEqual({
      event: "begin_checkout",
      plan: "annual",
      value: 262.8,
      currency: "BRL",
    });
  });

  it("pushes only the internal user id", () => {
    setUserId("01HXYZ");
    expect(dataLayer()).toEqual([{ user_id: "01HXYZ" }]);
  });

  it("never carries personal data keys", () => {
    track("login", { method: "whatsapp" });
    track("purchase", {
      transaction_id: "cs_test_1",
      value: 29.9,
      currency: "BRL",
      items: [{ item_id: "monthly", item_name: "Fluizer Pro monthly", price: 29.9, quantity: 1 }],
    });
    setUserId("01HXYZ");
    const keys = dataLayer().flatMap((entry) => Object.keys(entry));
    for (const key of PII_KEYS) expect(keys).not.toContain(key);
  });

  it("does nothing on the server", () => {
    delete (globalThis as { window?: unknown }).window;
    expect(() => track("login", { method: "phone" })).not.toThrow();
  });
});
