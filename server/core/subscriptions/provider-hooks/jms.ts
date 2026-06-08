import type { ProtocalHook, NodesHook, ProviderHook } from "./types";

const rewriteProtocols: ProtocalHook = (_, ps) =>
  ps.map((p) => {
    // JMS-1263669@c15s801.portablesubmarines.com:7531
    try {
      const url = new URL(`fuck://${p.name}`);
      // C15S801@JMS-1263669
      p.name = `${(url.hostname.split(".")[0] ?? url.hostname).toUpperCase()}@${url.username}`;
    } catch {
      //
    }
    return p;
  });

const rewriteNodes: NodesHook = (_, ns) => {
  const last = ns[ns.length - 1];
  if (last) {
    last.priceRate = 0.1;
    last.price = last.price * 0.1;
  }
  return ns;
};

export const jmsHook: ProviderHook = { name: "Just My Socks", rewriteProtocols, rewriteNodes };
