import { z } from "zod";
import { type Equals, assert } from "tsafe";
import type { Tag } from "@server/generated/prisma/dto";

// ── field definitions ─────────────────────────────────────────────────────────
// 这里逐个定义字段，作为项目所有有关 Tag 的 schema 的基石

const id = z.uuid();
const name = z.string().trim().min(1, "name cannot be empty").max(32);
const keywords = z.array(z.string().trim());

// ── single schema for create, update, and client-side form validation ─────────
// 必须完成一个完整的 Tag 的 schema
export const tag = z.object({ id, name, keywords });
// 必须断言 zod 体系和 prisma 体系的一致性
assert<Equals<z.infer<typeof tag>, Tag>>();
export type { Tag };
export const newItem = (): Tag => ({
  id: "",
  name: "",
  keywords: [],
});

// ── api schemas ───────────────────────────────────────────────────────────────

export const create = {
  body: tag,
};

export const upsert = {
  body: tag.extend({ id: z.union([id, z.literal("")]).optional() }),
};
