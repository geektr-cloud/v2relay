import { z } from "zod";
import { type Equals, assert } from "tsafe";
import { provider } from "../providers/schema";
import type { Subscription } from "@server/generated/prisma/dto";

// ── field definitions ─────────────────────────────────────────────────────────
// 这里逐个定义字段，作为项目所有有关 Subscription 的 schema 的基石

const id = z.uuid();
const providerId = z.uuid();
const name = z.string().trim().max(64);
const remark = z.string().trim().max(512);
const urls = z.array(z.string().trim().url()).min(1);
const enabled = z.boolean();
const price = z.number().min(0);
const createdAt = z.string();
const updatedAt = z.string();

// ── single schema for create, update, and client-side form validation ─────────
// 必须完成一个完整的 Subscription 的 schema
export const subscription = z.object({ id, providerId, name, remark, urls, enabled, price, createdAt, updatedAt });
// 必须断言 zod 体系和 prisma 体系的一致性
assert<Equals<z.infer<typeof subscription>, Subscription>>();
export type { Subscription };
export const newItem = (): Subscription => ({
  id: "",
  providerId: "",
  name: "",
  remark: "",
  urls: [],
  enabled: true,
  price: 0,
  createdAt: "",
  updatedAt: "",
});

// 对于业务中实际需要的每一类变体，都应该有对应的 schema，只允许在这个文件里派生 Schema
// 此处的用于 aggregate 查询
export const aggregatedSubscription = subscription.extend({ provider });
export type AggregatedSubscription = z.infer<typeof aggregatedSubscription>;

// ── api schemas ───────────────────────────────────────────────────────────────

export const create = {
  // createdAt / updatedAt 由数据库管理，写操作禁止下发
  body: subscription.omit({ createdAt: true, updatedAt: true }),
};

export const upsert = {
  body: subscription.omit({ createdAt: true, updatedAt: true }).extend({ id: z.union([id, z.literal("")]).optional() }),
};

const aggregate = z.enum(["true", "false"]).transform(Boolean).optional().default(false);

export const fetch = {
  query: z.object({ aggregate }).optional().default({ aggregate: false }),
};

export const fetchAll = {
  query: z.object({ aggregate, providerId: z.string().optional() }).optional().default({ aggregate: false }),
};

// ── content query (forceReload) ───────────────────────────────────────────────

const forceReload = z.stringbool().optional().default(false);

export const content = {
  query: z.object({ force_reload: forceReload }).optional().default({ force_reload: false }),
};
