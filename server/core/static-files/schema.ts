import { z } from "zod";
import { type Equals, assert } from "tsafe";
import type { StaticFile } from "@server/generated/prisma/dto";

const id = z.uuid();
const name = z
  .string()
  .trim()
  .min(1)
  .max(256)
  .refine((s) => !s.startsWith("/") && !s.endsWith("/") && !s.includes("//"), {
    message: "name cannot start/end with '/' or contain consecutive '/'",
  })
  .refine((s) => !s.endsWith("/sha256"), {
    message: "name cannot end with '/sha256'",
  });
const url = z.string().trim().url();
const expire = z.number().int().min(60);

export const staticFile = z.object({ id, name, url, expire });
assert<Equals<z.infer<typeof staticFile>, StaticFile>>();
export type { StaticFile };
export const newItem = (): StaticFile => ({
  id: "",
  name: "",
  url: "",
  expire: 86400,
});

export const create = {
  body: staticFile,
};

export const upsert = {
  body: staticFile.extend({ id: z.union([id, z.literal("")]).optional() }),
};

const forceReload = z.stringbool().optional().default(false);

export const content = {
  query: z.object({ force_reload: forceReload }).optional().default({ force_reload: false }),
};
