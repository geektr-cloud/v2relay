import { AnyTls } from "@server/pkgs/protocols/anytls";
import { Shadowsocks } from "@server/pkgs/protocols/shadowsocks";
import { ShadowsocksR } from "@server/pkgs/protocols/ssr";
import { VLess } from "@server/pkgs/protocols/vless";
import { VMess } from "@server/pkgs/protocols/vmess";
import type { Protocol, ProtocolStatic } from "@server/pkgs/protocols/types";

const Protocols = [Shadowsocks, ShadowsocksR, VMess, VLess, AnyTls] as const satisfies readonly ProtocolStatic[];

export const parseClash = (object: unknown): Protocol | null => {
  if (!object || typeof object !== "object") return null;
  for (const P of Protocols) if (P.testClash(object)) return P.fromClash(object);
  return null;
};
