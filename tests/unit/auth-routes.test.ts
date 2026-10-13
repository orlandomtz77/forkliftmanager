import { describe, expect, it } from "vitest";
import {
  getAuthRedirect,
  HOME_PATH,
  isPublicPath,
  LOGIN_PATH,
} from "@/lib/auth/routes";

describe("isPublicPath", () => {
  it("treats /login as public", () => {
    expect(isPublicPath("/login")).toBe(true);
  });

  it("does not treat lookalike paths as public", () => {
    expect(isPublicPath("/login-admin")).toBe(false);
    expect(isPublicPath("/dashboard")).toBe(false);
  });
});

describe("getAuthRedirect", () => {
  it("sends anonymous users on protected pages to login", () => {
    expect(getAuthRedirect("/dashboard", false)).toBe(LOGIN_PATH);
    expect(getAuthRedirect("/equipment/123", false)).toBe(LOGIN_PATH);
    expect(getAuthRedirect("/", false)).toBe(LOGIN_PATH);
  });

  it("lets anonymous users reach login", () => {
    expect(getAuthRedirect("/login", false)).toBeNull();
  });

  it("sends authenticated users away from login", () => {
    expect(getAuthRedirect("/login", true)).toBe(HOME_PATH);
  });

  it("lets authenticated users reach protected pages", () => {
    expect(getAuthRedirect("/dashboard", true)).toBeNull();
  });
});
