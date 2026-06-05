import { z } from "zod";
import { type Equals, assert } from "tsafe";
import type { Route } from "@server/generated/prisma/dto";
import { filterSchema } from "../nodes/node-filter";

export const OUTBOUND_VALUES = ["DIRECT", "REJECT", "REJECT-DROP", "PROXY"] as const;
export type Outbound = (typeof OUTBOUND_VALUES)[number];

const id = z.uuid();
const name = z.string().trim().min(1).max(64);
const outbound = z.string().refine((v) => (OUTBOUND_VALUES as readonly string[]).includes(v), {
  message: "invalid outbound",
});
const rulesets = z.array(z.uuid());
const rules = z.string();
const filter = filterSchema;

export const route = z.object({ id, name, outbound, rulesets, rules, filter });
assert<Equals<z.infer<typeof route>, Route>>();
export type { Route };
export const newItem = (): Route => ({
  id: "",
  name: "",
  outbound: "PROXY",
  rulesets: [],
  rules: "",
  filter: { type: "none" },
});

export const create = {
  body: route,
};

export const upsert = {
  body: route.extend({ id: z.union([id, z.literal("")]).optional() }),
};
