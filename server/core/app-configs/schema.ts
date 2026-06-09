import { z } from "zod";
import { type Equals, assert } from "tsafe";
import type { AppConfig } from "@server/generated/prisma/dto";
import { filterSchema } from "../nodes/node-filter";

const id = z.uuid();
const name = z.string().trim().min(1).max(64);
const overrideName = z.string().trim().max(64);
const apiToken = z.string();
const type = z.string();
const typeEnum = z.enum(["clash", "v2ray"]);
export const appConfigTypes = typeEnum.options;
const template = z.string();
const config = z.any();
const nodeFilter = filterSchema;

export const appConfig = z.object({ id, name, overrideName, apiToken, type, template, config, nodeFilter });
assert<Equals<z.infer<typeof appConfig>, AppConfig>>();
export type { AppConfig };
export const newItem = (): AppConfig => ({
  id: "",
  name: "",
  overrideName: "",
  apiToken: "",
  type: "clash",
  template: "",
  config: {},
  nodeFilter: { type: "none" },
});

export const create = {
  body: appConfig.omit({ apiToken: true }).extend({ type: typeEnum }),
};

export const upsert = {
  body: appConfig
    .omit({ apiToken: true })
    .extend({ id: z.union([id, z.literal("")]).optional(), type: typeEnum }),
};
