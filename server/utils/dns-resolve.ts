/**
 * 通过 Cloudflare 1.1.1.1 DoH (RFC 8484, GET + ?dns=) 批量解析 A 记录。
 *
 * - 输入为 IPv4 / IPv6 字面量时原样返回
 * - 相同域名只发起一次查询（并行）
 * - 返回数组与输入位置一一对应；解析失败时回退为原域名
 */

const DOH_ENDPOINT = "https://doh.360.cn/dns-query";

const IPV4_RE = /^(?:\d{1,3}\.){3}\d{1,3}$/;

function isIp(input: string): boolean {
  return IPV4_RE.test(input) || input.includes(":");
}

/** base64url（无填充）编码，用于 `?dns=` 参数 */
function base64url(buf: Uint8Array): string {
  let s = "";
  for (const b of buf) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** 构造 RFC 1035 A/IN 查询报文 (id=0, RD=1, 单 QNAME) */
function encodeQuery(domain: string): Uint8Array {
  const labels = domain.split(".").filter((l) => l.length > 0);
  const qnameLen = labels.reduce((s, l) => s + 1 + l.length, 0) + 1;
  const buf = new Uint8Array(12 + qnameLen + 4);

  // header: id=0, flags=0x0100 (RD), QDCOUNT=1
  buf[5] = 0x01;
  buf[2] = 0x01;

  let p = 12;
  for (const l of labels) {
    buf[p++] = l.length;
    for (let i = 0; i < l.length; i++) buf[p++] = l.charCodeAt(i);
  }
  buf[p++] = 0; // root label
  // QTYPE=A(1), QCLASS=IN(1)
  buf[p++] = 0x00;
  buf[p++] = 0x01;
  buf[p++] = 0x00;
  buf[p] = 0x01;

  return buf;
}

/** 跳过 DNS name 字段，返回 name 之后的 offset。支持指针压缩 (RFC 1035 §4.1.4) */
function skipName(buf: Uint8Array, offset: number): number {
  while (offset < buf.length) {
    const len = buf[offset] ?? 0;
    if (len === 0) return offset + 1;
    if ((len & 0xc0) === 0xc0) return offset + 2;
    offset += len + 1;
  }
  return offset;
}

/** 从 DNS 响应中提取首个 A 记录的点分十进制；无则返回 null */
function firstARecord(buf: Uint8Array): string | null {
  if (buf.byteLength < 12) return null;
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

  const rcode = view.getUint16(2) & 0x000f;
  if (rcode !== 0) return null;

  const qdcount = view.getUint16(4);
  const ancount = view.getUint16(6);
  if (ancount === 0) return null;

  let offset = 12;
  for (let i = 0; i < qdcount; i++) {
    offset = skipName(buf, offset);
    offset += 4; // QTYPE + QCLASS
  }

  for (let i = 0; i < ancount; i++) {
    offset = skipName(buf, offset);
    const type = view.getUint16(offset);
    const cls = view.getUint16(offset + 2);
    const rdlen = view.getUint16(offset + 8);
    const rdstart = offset + 10;
    if (type === 1 && cls === 1 && rdlen === 4) {
      return `${buf[rdstart]}.${buf[rdstart + 1]}.${buf[rdstart + 2]}.${buf[rdstart + 3]}`;
    }
    offset = rdstart + rdlen;
  }
  return null;
}

async function resolveOne(domain: string): Promise<string> {
  try {
    const dns = base64url(encodeQuery(domain));
    const res = await fetch(`${DOH_ENDPOINT}?dns=${dns}`, {
      headers: { accept: "application/dns-message" },
    });
    if (!res.ok) return domain;
    const body = new Uint8Array(await res.arrayBuffer());
    return firstARecord(body) ?? domain;
  } catch {
    return domain;
  }
}

export async function dnsResolve(domainList: string[]): Promise<Map<string, string>> {
  const uniqueDomains = [...new Set(domainList.filter((d) => !isIp(d)))];
  const pairs = await Promise.all(uniqueDomains.map(async (d) => [d, await resolveOne(d)] as const));
  return new Map(pairs);
}
