import { describe, expect, it } from "vitest";
import { nameSchema, normalizePhone, pinSchema, registerSchema } from "@/lib/shared/validation";

describe("Phase 1 · input validation (unit)", () => {
  it("normalises Sri Lankan phone numbers to E.164", () => {
    expect(normalizePhone("0771234567")).toBe("+94771234567");
    expect(normalizePhone("077 123 4567")).toBe("+94771234567");
    expect(normalizePhone("+94 77 123 4567")).toBe("+94771234567");
    expect(normalizePhone("94771234567")).toBe("+94771234567");
  });

  it("treats different spellings of the same number as identical (duplicate guard)", () => {
    const variants = ["0771234567", "+94771234567", "077-123-4567", "(077) 1234567"];
    expect(new Set(variants.map(normalizePhone)).size).toBe(1);
  });

  it("accepts international numbers and rejects junk", () => {
    expect(normalizePhone("+44 7911 123456")).toBe("+447911123456");
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("abcdefghij")).toBeNull();
    expect(normalizePhone("")).toBeNull();
  });

  it("cleans and validates names", () => {
    expect(nameSchema.parse("  Nimal   Perera ")).toBe("Nimal Perera");
    expect(nameSchema.parse("D'Silva-Fernando Jr.")).toBe("D'Silva-Fernando Jr.");
    expect(nameSchema.parse("නිමල්")).toBe("නිමල්"); // Sinhala
    expect(nameSchema.parse("நிமல்")).toBe("நிமல்"); // Tamil
    expect(() => nameSchema.parse("A")).toThrow();
    expect(() => nameSchema.parse("x".repeat(41))).toThrow();
    expect(() => nameSchema.parse("<script>")).toThrow();
    expect(() => nameSchema.parse("Bob123")).toThrow();
  });

  it("requires 6-digit PINs", () => {
    expect(pinSchema.safeParse("123456").success).toBe(true);
    expect(pinSchema.safeParse("12345").success).toBe(false);
    expect(pinSchema.safeParse("12345a").success).toBe(false);
  });

  it("rejects operator-injection objects in place of strings", () => {
    const r = registerSchema.safeParse({ name: "Nimal", phone: { $gt: "" }, teamId: { $ne: null } });
    expect(r.success).toBe(false);
  });
});
