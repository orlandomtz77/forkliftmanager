import { describe, expect, it } from "vitest";
import { loginSchema } from "@/lib/validations/auth";

describe("loginSchema", () => {
  it("normalizes the email", () => {
    const result = loginSchema.parse({
      email: "  Admin@Example.TEST ",
      password: "secret",
    });
    expect(result.email).toBe("admin@example.test");
  });

  it("rejects an invalid email", () => {
    const result = loginSchema.safeParse({ email: "nope", password: "x" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing password", () => {
    const result = loginSchema.safeParse({
      email: "a@example.test",
      password: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-string input such as null form fields", () => {
    const result = loginSchema.safeParse({ email: null, password: null });
    expect(result.success).toBe(false);
  });
});
