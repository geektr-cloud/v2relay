import { z } from "zod";
import { type Equals, assert } from "tsafe";
import { subscription } from "../subscriptions/schema";
import type { Node } from "@server/generated/prisma/dto";

// ── field definitions ─────────────────────────────────────────────────────────
// 这里逐个定义字段，作为项目所有有关 Node 的 schema 的基石

const id = z.uuid();
const subscriptionId = z.uuid();
const name = z.string().trim().max(64);
const protocol = z.string().trim().max(32);
const remark = z.string().trim().max(512);
const ip = z.union([z.ipv4(), z.ipv6()]);
const priceRate = z.number().min(0);
const price = z.number().min(0);
const tags = z.array(z.string().trim());
const connInfo = z.any();

// ── single schema for create, update, and client-side form validation ─────────
// 必须完成一个完整的 Node 的 schema
export const node = z.object({ id, subscriptionId, name, protocol, remark, ip, priceRate, price, tags, connInfo });
// 必须断言 zod 体系和 prisma 体系的一致性
assert<Equals<z.infer<typeof node>, Node>>();
export type { Node };
export const newItem = (): Node => ({
  id: "",
  subscriptionId: "",
  tags: [],
  protocol: "",
  name: "",
  remark: "",
  ip: "",
  priceRate: 1,
  price: 0,
  connInfo: {},
});

// 对于业务中实际需要的每一类变体，都应该有对应的 schema，只允许在这个文件里派生 Schema
// 此处的用于 aggregate 查询
export const aggregatedNode = node.extend({ subscription });
export type AggregatedNode = z.infer<typeof aggregatedNode>;

// ── api schemas ──────────────────────────────────────────────────────────────

export const create = {
  body: node,
};

export const upsert = {
  body: node.extend({ id: z.union([id, z.literal("")]).optional() }),
};

const aggregate = z.enum(["true", "false"]).transform(Boolean).optional().default(false);

export const fetch = {
  query: z.object({ aggregate }).optional().default({ aggregate: false }),
};

export const fetchAll = {
  query: z.object({ aggregate, subscriptionId: z.string().optional() }).optional().default({ aggregate: false }),
};
