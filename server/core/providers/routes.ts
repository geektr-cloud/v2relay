import { Hono } from "hono";
import z from "zod";
import { prisma } from "@server/db";
import * as mid from "@server/middlewares";
import { zValidator } from "@hono/zod-validator";
import * as schema from "./schema";
import { HttpErr } from "@server/utils/http-errors";

function idOrNameWhere(idOrName: string) {
  return z.uuid().safeParse(idOrName).success ? { id: idOrName } : { name: idOrName };
}

export const providerRoutes = new Hono()
  .get("/", async (c) => c.json(await prisma.provider.findMany()))
  .get("/:idOrName", mid.paramIdOrName, async (c) => {
    const { idOrName } = c.req.valid("param");
    const provider = await prisma.provider.findUnique({ where: idOrNameWhere(idOrName) });
    if (!provider) throw HttpErr(404, "Provider not found");
    return c.json(provider);
  })
  .post("/", zValidator("json", schema.create.body), async (c) =>
    c.json(await prisma.provider.create({ data: c.req.valid("json") })),
  )
  .put("/", zValidator("json", schema.upsert.body), async (c) => {
    const { id, ...data } = c.req.valid("json");
    if (id) {
      const existing = await prisma.provider.findUnique({ where: { id } });
      if (!existing) throw HttpErr(404, "Provider not found");
      return c.json(await prisma.provider.update({ where: { id }, data }));
    }
    return c.json(await prisma.provider.create({ data }));
  })
  .put("/:id", mid.paramId, zValidator("json", schema.create.body), async (c) => {
    const { id } = c.req.valid("param");
    const existing = await prisma.provider.findUnique({ where: { id } });
    if (!existing) throw HttpErr(404, "Provider not found");
    return c.json(await prisma.provider.update({ where: { id }, data: c.req.valid("json") }));
  })
  .delete("/:id", mid.paramId, async (c) => {
    const { id } = c.req.valid("param");
    const existing = await prisma.provider.findUnique({ where: { id } });
    if (!existing) throw HttpErr(404, "Provider not found");
    const provider = await prisma.provider.delete({ where: { id } });
    return c.json(provider);
  });
