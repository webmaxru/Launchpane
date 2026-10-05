import { describe, expect, it } from "vitest"
import { isLoginItem, parentAppName } from "@/lib/login-items"

describe("login item helpers", () => {
  it("identifies the login item source", () => {
    expect(isLoginItem("LoginItem")).toBe(true)
    expect(isLoginItem("UserAgent")).toBe(false)
  })

  it("derives the parent app name from a helper bundle path", () => {
    expect(
      parentAppName("/Applications/VOX.app/Contents/Library/LoginItems/VOXAgent.app")
    ).toBe("VOX")
    expect(
      parentAppName(
        "/Applications/UA Connect.app/Contents/Library/LoginItems/UA Connect Launcher.app"
      )
    ).toBe("UA Connect")
  })

  it("returns null for paths that are not login items", () => {
    expect(
      parentAppName("/Users/test/Library/LaunchAgents/com.example.test.plist")
    ).toBeNull()
  })
})
