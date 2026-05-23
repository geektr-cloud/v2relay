import { z } from "zod";
import { type Equals, assert } from "tsafe";
import type { SystemNotice } from "@server/generated/prisma/dto";

// ── field definitions ─────────────────────────────────────────────────────────
// 这里逐个定义字段，作为项目所有有关 SystemNotice 的 schema 的基石

const id = z.uuid();
const message = z.string().max(8192);
const createdAt = z.string();

// ── single schema ─────────────────────────────────────────────────────────────
export const systemNotice = z.object({ id, message, createdAt });
assert<Equals<z.infer<typeof systemNotice>, SystemNotice>>();
export type { SystemNotice };

// ── api schemas ───────────────────────────────────────────────────────────────

export const fetchAll = {
  query: z.object({}).optional().default({}),
};
