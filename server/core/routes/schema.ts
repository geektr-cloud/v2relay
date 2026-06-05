import { z } from "zod";
import { type Equals, assert } from "tsafe";
import type { Route } from "@server/generated/prisma/dto";
import { filterSchema } from "../nodes/node-filter";

const id = z.uuid();
const name = z.string().trim().min(1).max(64);
const rulesets = z.array(z.uuid());
const filter = filterSchema;

export const route = z.object({ id, name, rulesets, filter });
assert<Equals<z.infer<typeof route>, Route>>();
export type { Route };
export const newItem = (): Route => ({
  id: "",
  name: "",
  rulesets: [],
  filter: { type: "none" },
});

export const create = {
  body: route,
};

export const upsert = {
  body: route.extend({ id: z.union([id, z.literal("")]).optional() }),
};
