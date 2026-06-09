import { z } from "zod";
import { type Equals, assert } from "tsafe";
import type { Ruleset } from "@server/generated/prisma/dto";

const id = z.uuid();
const name = z.string().trim().min(1).max(64);
const description = z.string().default("");
const url = z.union([z.literal(""), z.string().trim().url()]);
const rules = z.string();
const createdAt = z.string();
const updatedAt = z.string();

export const ruleset = z.object({ id, name, description, url, rules, createdAt, updatedAt });
assert<Equals<z.infer<typeof ruleset>, Ruleset>>();
export type { Ruleset };
export const newItem = (): Ruleset => ({
  id: "",
  name: "",
  description: "",
  url: "",
  rules: "",
  createdAt: "",
  updatedAt: "",
});

// url and rules are mutually exclusive; exactly one must be non-empty.
const mutex = <T extends { url: string; rules: string }>(s: z.ZodType<T>) =>
  s.refine((v) => (v.url !== "") !== (v.rules !== ""), {
    message: "url and rules are mutually exclusive; provide exactly one",
    path: ["rules"],
  });

export const create = {
  body: mutex(ruleset.omit({ createdAt: true, updatedAt: true })),
};

export const upsert = {
  body: mutex(
    ruleset.omit({ createdAt: true, updatedAt: true }).extend({ id: z.union([id, z.literal("")]).optional() }),
  ),
};

// 容许的过期时间（秒）：缓存年龄小于该值则跳过上游重新拉取，直接复用缓存。
//   undefined → 永远复用已有缓存（仅缓存缺失时才拉取，等价旧的 force_reload=false）
//   0         → 永远重新拉取（等价旧的 force_reload=true）
const maxAge = z.coerce.number().int().nonnegative().optional();

export const content = {
  query: z.object({ max_age: maxAge }).optional().default({}),
};

export const parsed = {
  query: z.object({ max_age: maxAge }).optional().default({}),
};

// 解析+归类后的副本：每条传统规则经 toRuleSetItem() 降级到三种 rule-providers 载荷之一。
export const parsedRules = z.object({
  classical: z.array(z.string()),
  domain: z.array(z.string()),
  ipcidr: z.array(z.string()),
});
export type ParsedRules = z.infer<typeof parsedRules>;
