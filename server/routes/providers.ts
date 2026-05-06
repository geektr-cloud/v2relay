import { Hono } from "hono";
import { prisma } from "../db";
import * as mid from "../middlewares";
import { zValidator } from "@hono/zod-validator";
import { schema } from "../core/providers/schema";

export const providerRoutes = new Hono();

providerRoutes.get("/", async (c) => c.json(await prisma.provider.findMany()));

providerRoutes.get("/:idOrName", mid.paramIdOrName, async (c) => {
  const { where } = c.req.valid("param");
  const provider = await prisma.provider.findUnique({ where });
  if (!provider) return c.json({ error: "Provider not found" }, 404);
  return c.json(provider);
});

providerRoutes.post("/", zValidator("json", schema), async (c) =>
  c.json(await prisma.provider.create({ data: c.req.valid("json") })),
);

providerRoutes.put("/:idOrName", mid.paramIdOrName, zValidator("json", schema), async (c) => {
  const { where } = c.req.valid("param");
  const provider = await prisma.provider.findUnique({ where });
  if (!provider) return c.json({ error: "Provider not found" }, 404);
  return c.json(await prisma.provider.update({ where, data: c.req.valid("json") }));
});

providerRoutes.delete("/:idOrName", mid.paramIdOrName, async (c) => {
  const { where } = c.req.valid("param");
  const provider = await prisma.provider.findUnique({ where });
  if (!provider) return c.json({ error: "Provider not found" }, 404);
  return c.json(await prisma.provider.delete({ where }));
});
