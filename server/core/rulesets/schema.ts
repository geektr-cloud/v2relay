import { z } from "zod";
import { type Equals, assert } from "tsafe";
import type { Ruleset } from "@server/generated/prisma/dto";

const id = z.uuid();
const name = z.string().trim().min(1).max(64);
const url = z.union([z.literal(""), z.string().trim().url()]);
const rules = z.string();
const createdAt = z.string();
const updatedAt = z.string();

export const ruleset = z.object({ id, name, url, rules, createdAt, updatedAt });
assert<Equals<z.infer<typeof ruleset>, Ruleset>>();
export type { Ruleset };
export const newItem = (): Ruleset => ({
  id: "",
  name: "",
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

const forceReload = z.stringbool().optional().default(false);

export const content = {
  query: z.object({ force_reload: forceReload }).optional().default({ force_reload: false }),
};
