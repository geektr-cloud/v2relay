import { z } from "zod";
import { type Equals, assert } from "tsafe";
import type { Provider } from "@server/generated/prisma/dto";

// ── field definitions ─────────────────────────────────────────────────────────
// 这里逐个定义字段，作为项目所有有关 Provider 的 schema 的基石

const id = z.uuid();
const name = z.string().trim().min(1).max(32);
const url = z.union([z.literal(""), z.url()]);

// ── single schema for create, update, and client-side form validation ─────────
// 必须完成一个完整的 Provider 的 schema
export const provider = z.object({ id, name, url });
// 必须断言 zod 体系和 prisma 体系的一致性
assert<Equals<z.infer<typeof provider>, Provider>>();
export type { Provider };
export const newItem = (): Provider => ({
  id: "",
  name: "",
  url: "",
});

// ── api schemas ───────────────────────────────────────────────────────────────

export const create = {
  body: provider,
};

export const upsert = {
  body: provider.extend({ id: z.union([id, z.literal("")]).optional() }),
};
