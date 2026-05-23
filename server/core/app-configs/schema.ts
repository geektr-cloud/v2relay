import { z } from "zod";
import { type Equals, assert } from "tsafe";
import type { AppConfig } from "@server/generated/prisma/dto";

const id = z.uuid();
const name = z.string().trim().min(1).max(64);
const type = z.string();
const typeEnum = z.enum(["clash", "v2ray", "sing-box"]);
export const appConfigTypes = typeEnum.options;
const template = z.string();
const config = z.any();

export const appConfig = z.object({ id, name, type, template, config });
assert<Equals<z.infer<typeof appConfig>, AppConfig>>();
export type { AppConfig };
export const newItem = (): AppConfig => ({
  id: "",
  name: "",
  type: "clash",
  template: "",
  config: {},
});

export const create = {
  body: appConfig.extend({ type: typeEnum }),
};

export const upsert = {
  body: appConfig.extend({ id: z.union([id, z.literal("")]).optional(), type: typeEnum }),
};
