import YAML from "yaml";

export const CT_JSON = "application/json";
export const CT_YAML = "application/yaml";
export const CT_NODELIST = "application/nodelist";
export const CT_TEXT = "text/plain; charset=utf-8";

/**
 * sniffer 能够识别为「结构化订阅」的 content-type 集合（不含 text/plain 兜底）
 */
export const STRUCTURED_CONTENT_TYPES = new Set<string>([CT_JSON, CT_YAML, CT_NODELIST]);

export const isStructuredContentType = (ct: string): boolean => STRUCTURED_CONTENT_TYPES.has(ct);

/**
 * 仅基于文本内容做嗅探（不含后缀判定、不含 base64 兜底）。
 * 命中返回具体 content-type，否则 null。
 */
const sniffByText = (text: string): string | null => {
  try {
    JSON.parse(text);
    return CT_JSON;
  } catch {
    //
  }
  try {
    const parsed = YAML.parse(text);
    if (parsed !== null && typeof parsed === "object") return CT_YAML;
  } catch {
    //
  }
  const firstLine = text
    .split("\n")
    .map((s) => s.trim())
    .find((s) => s.length > 0);
  if (firstLine) {
    try {
      new URL(firstLine);
      return CT_NODELIST;
    } catch {
      //
    }
  }
  return null;
};

export type SniffResult = {
  /** 嗅探出的 content-type */
  type: string;
  /** 嗅探后用作存储/上传的规范文本：若命中 atob 分支则为解码后的字符串，否则为原文 */
  content: string;
};

/**
 * 探测内容的 content-type，并返回规范化后的文本内容：
 *   1. 若提供 name 且后缀是 .json / .yml / .yaml，直接命中
 *   2. 依次尝试 JSON / YAML / nodelist（首行可 new URL）
 *   3. 都不行时再尝试 atob 后重做 2，命中则 content 替换为解码后的文本
 *   4. 兜底 text/plain; charset=utf-8，content 为原文
 */
export const sniffContentType = async (input: File | string | ArrayBuffer, name?: string): Promise<SniffResult> => {
  let content: string;
  if (typeof input === "string") {
    content = input;
  } else if (input instanceof ArrayBuffer) {
    content = new TextDecoder().decode(input);
  } else {
    content = await input.text();
  }

  if (name) {
    const ext = name.toLowerCase().split(".").pop() ?? "";
    if (ext === "json") return { type: CT_JSON, content };
    if (ext === "yml" || ext === "yaml") return { type: CT_YAML, content };
  }

  const direct = sniffByText(content);
  if (direct) return { type: direct, content };

  try {
    content = atob(content.replace(/\s/g, ""));
    const indirect = sniffByText(content);
    if (indirect) return { type: indirect, content };
  } catch {
    //
  }

  return { type: CT_TEXT, content };
};
