import YAML from "yaml";

import { AnyTls } from "./anytls";
import { Shadowsocks } from "./shadowsocks";
import { ShadowsocksR } from "./ssr";
import type { Protocol, ProtocolStatic } from "./types";
import { VLess } from "./vless";
import { VMess } from "./vmess";
import { createNotices } from "@server/core/system-notices/create-notices";

export { AnyTls } from "./anytls";
export { Shadowsocks } from "./shadowsocks";
export { ShadowsocksR } from "./ssr";
export { VLess } from "./vless";
export { VMess } from "./vmess";
export type { Protocol, ProtocolStatic } from "./types";

/**
 * 所有支持的协议类。
 *
 * 顺序决定了 {@link parseUrl} / {@link findProtocol} 的匹配优先级——
 * 任何两个协议的 `testUrl` 都不应共享同一前缀，因此实际上顺序无所谓。
 */
export const Protocols = [Shadowsocks, ShadowsocksR, VMess, VLess, AnyTls] as const satisfies readonly ProtocolStatic[];

/** 找到能识别该 URL 的协议类，找不到返回 null */
export const findProtocol = (url: string): ProtocolStatic | null => {
  for (const P of Protocols) {
    if (P.testUrl(url)) return P;
  }
  return null;
};

/** 找到能识别该 clash 节点对象的协议类，找不到返回 null */
export const findProtocolByClash = (object: object): ProtocolStatic | null => {
  for (const P of Protocols) {
    if (P.testClash(object)) return P;
  }
  return null;
};

/**
 * 将分享链接解析成协议实例；URL 前缀未命中任何已知协议时返回 null。
 * `formUrl` 自身的解析错误仍会抛出。
 */
export const parseUrl = (url: string): Protocol | null => {
  const P = findProtocol(url);
  return P ? P.formUrl(url) : null;
};

/**
 * 将 clash / mihomo 节点对象解析成协议实例；未命中任何已知 `type` 时返回 null。
 * `fromClash` 自身的解析错误仍会抛出。
 */
export const parseClash = (object: unknown): Protocol | null => {
  if (!object || typeof object !== "object") return null;
  const P = findProtocolByClash(object);
  return P ? P.fromClash(object) : null;
};

/**
 * 解析 v2rayN / nodelist 风格的纯文本订阅：按行拆分，逐行 {@link parseUrl}。
 * 空行、注释行（以 `#` 开头）、未知前缀以及解析失败的行都会被静默跳过——
 * 一条坏节点不应让整条订阅作废。
 */
export const fromNodelist = (content: string): Protocol[] => {
  const out: Protocol[] = [];
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    try {
      const node = parseUrl(line);
      if (node) out.push(node);
    } catch {
      // 单条解析失败不影响其他节点
    }
  }
  return out;
};

/** {@link fromYaml} 的返回值 */
export interface ClashYamlParseResult {
  /** 已成功解析的 clash `proxies` 节点 */
  protocols: Protocol[];
  /**
   * 从 `proxy-groups` 中 `type: select` 的分组归纳出的隶属关系：
   * key 为 proxy-item 名称（既可能是某个 proxy 名，也可能是另一个 group 名），
   * value 为引用了该 item 的所有 select 分组的名称集合。
   */
  groupToProxy: Map<string, Set<string>>;
}

/**
 * 解析 clash / mihomo YAML：
 * - `proxies` 数组逐项 {@link parseClash}，得到 `protocols`；
 * - `proxy-groups` 中 `type: select` 的分组逐个展开 `proxies` 列表，
 *   反向得到 `groups: Map<itemName, Set<groupName>>`。
 *
 * 缺失或非数组的字段会被静默忽略；YAML 解析失败时返回空结果。
 * 单个节点 / 分组构造失败不会中断其他条目。
 */
export const fromYaml = (content: string): ClashYamlParseResult => {
  const empty: ClashYamlParseResult = { protocols: [], groupToProxy: new Map() };

  let doc: unknown;
  try {
    doc = YAML.parse(content);
  } catch {
    return empty;
  }
  if (!doc || typeof doc !== "object") return empty;

  const protocols: Protocol[] = [];
  const proxies = (doc as { proxies?: unknown }).proxies;

  const notices: Set<string> = new Set();

  if (Array.isArray(proxies)) {
    for (const item of proxies) {
      try {
        const node = parseClash(item);
        if (node) {
          protocols.push(node)
        } else {
          if (item?.type) notices.add(`Failed to parse proxy: type=${JSON.stringify(item?.type)}`);
        }
      } catch {
        notices.add(`Failed to parse proxy: json=${JSON.stringify(item)}`);
      }
    }
  }

  if (notices.size > 0) createNotices(notices);

  const groupToProxy = new Map<string, Set<string>>();
  const proxyGroups = (doc as Record<string, unknown>)["proxy-groups"];
  if (Array.isArray(proxyGroups)) {
    for (const raw of proxyGroups) {
      if (!raw || typeof raw !== "object") continue;
      const g = raw as Record<string, unknown>;
      if (g["type"] !== "select") continue;
      const groupName = typeof g["name"] === "string" ? g["name"] : "";
      if (!groupName) continue;
      const items = g["proxies"];
      if (!Array.isArray(items)) continue;
      groupToProxy.set(groupName, new Set(items))
    }
  }

  return { protocols, groupToProxy };
};
