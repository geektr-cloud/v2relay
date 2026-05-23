import { z } from "zod";
import { type Equals, assert } from "tsafe";
import type { Ruleset } from "@server/generated/prisma/dto";

const id = z.uuid();
const name = z.string().trim().min(1).max(64);
const url = z.string().trim().url();
const createdAt = z.string();
const updatedAt = z.string();

export const ruleset = z.object({ id, name, url, createdAt, updatedAt });
assert<Equals<z.infer<typeof ruleset>, Ruleset>>();
export type { Ruleset };
export const newItem = (): Ruleset => ({
  id: "",
  name: "",
  url: "",
  createdAt: "",
  updatedAt: "",
});

export const create = {
  body: ruleset.omit({ createdAt: true, updatedAt: true }),
};

export const upsert = {
  body: ruleset.omit({ createdAt: true, updatedAt: true }).extend({ id: z.union([id, z.literal("")]).optional() }),
};
