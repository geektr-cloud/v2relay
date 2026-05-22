import { AnyTls } from "./anytls";
import { Shadowsocks } from "./shadowsocks";
import { ShadowsocksR } from "./ssr";
import type { Protocol, ProtocolStatic } from "./types";
import { VLess } from "./vless";
import { VMess } from "./vmess";

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
export const findProtocolByObject = (object: object): ProtocolStatic | null => {
  for (const P of Protocols) {
    if (P.testObject(object)) return P;
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
