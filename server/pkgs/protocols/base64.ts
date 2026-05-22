// Workers/Node 都内置 atob/btoa（处理标准 base64），URL-safe 变体自己折一下。
// 解码同时容忍标准与 URL-safe 输入，并补足 padding；编码统一输出 URL-safe 无 padding。
// btoa/atob 只接受 Latin-1，所以这里夹一层 UTF-8 编解码以支持中文 / Emoji 等
// （SSR remarks/group、VMess ps 等字段实战中常见）。

const utf8ToBinary = (input: string): string => {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return binary;
};

const binaryToUtf8 = (binary: string): string => {
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
};

export const base64UrlDecode = (input: string): string => {
  const cleaned = input.replace(/\s/g, "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = cleaned + "=".repeat((4 - (cleaned.length % 4)) % 4);
  return binaryToUtf8(atob(padded));
};

export const base64UrlEncode = (input: string): string =>
  btoa(utf8ToBinary(input)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export const tryBase64UrlDecode = (input: string): string | null => {
  try {
    return base64UrlDecode(input);
  } catch {
    return null;
  }
};
