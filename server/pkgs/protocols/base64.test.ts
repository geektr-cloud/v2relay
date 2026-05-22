import { describe, expect, it } from "vitest";
import { base64UrlDecode, base64UrlEncode, tryBase64UrlDecode } from "./base64";

describe("base64UrlEncode / base64UrlDecode", () => {
  it("encode/decode roundtrip for ASCII inputs", () => {
    for (const s of ["", "a", "ab", "abc", "hello world", "method:password", "aes-256-gcm:supersecret"]) {
      expect(base64UrlDecode(base64UrlEncode(s))).toBe(s);
    }
  });

  it("encode/decode roundtrip for UTF-8 (CJK + emoji) inputs", () => {
    for (const s of ["节点", "测试组", "你好世界", "Hello 🎉 World"]) {
      expect(base64UrlDecode(base64UrlEncode(s))).toBe(s);
    }
  });

  it("encode strips padding", () => {
    expect(base64UrlEncode("hello")).toBe("aGVsbG8");
    expect(base64UrlEncode("hello!")).toBe("aGVsbG8h");
  });

  it("encode uses URL-safe alphabet (- replaces +, _ replaces /)", () => {
    // "?>>" 标准 base64 = "Pz4+"，含 `+`，url-safe 后为 "Pz4-"
    expect(base64UrlEncode("?>>")).toBe("Pz4-");
    // ">>?" 标准 base64 = "Pj4/"，含 `/`，url-safe 后为 "Pj4_"
    expect(base64UrlEncode(">>?")).toBe("Pj4_");
  });

  it("decode accepts standard base64 with padding", () => {
    expect(base64UrlDecode("aGVsbG8=")).toBe("hello");
    expect(base64UrlDecode("YWJj")).toBe("abc");
  });

  it("decode accepts URL-safe base64", () => {
    expect(base64UrlDecode("aGk_Pw")).toBe("hi??");
    expect(base64UrlDecode("Pz4-")).toBe("?>>");
  });

  it("decode tolerates missing padding", () => {
    expect(base64UrlDecode("aGVsbG8")).toBe("hello");
    expect(base64UrlDecode("aGVsbG8h")).toBe("hello!");
  });

  it("decode strips whitespace before decoding", () => {
    expect(base64UrlDecode("aG Vs bG8")).toBe("hello");
    expect(base64UrlDecode("aGVsbG8\n")).toBe("hello");
  });

  it("tryBase64UrlDecode returns null on invalid input", () => {
    expect(tryBase64UrlDecode("@@@@")).toBe(null);
    expect(tryBase64UrlDecode("$$$$")).toBe(null);
  });

  it("tryBase64UrlDecode returns decoded string on valid input", () => {
    expect(tryBase64UrlDecode("aGVsbG8")).toBe("hello");
  });
});
