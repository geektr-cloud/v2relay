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

export const rulesetRoutes = new Hono()
  .get("/", async (c) => c.json(await prisma.ruleset.findMany({ orderBy: { updatedAt: "desc" } })))
  .get("/:idOrName", mid.paramIdOrName, async (c) => {
    const { idOrName } = c.req.valid("param");
    const item = await prisma.ruleset.findUnique({ where: idOrNameWhere(idOrName) });
    if (!item) throw HttpErr(404, "Ruleset not found");
    return c.json(item);
  })
  .put("/", zValidator("json", schema.upsert.body), async (c) => {
    const { id, ...data } = c.req.valid("json");
    if (id) {
      const existing = await prisma.ruleset.findUnique({ where: { id } });
      if (!existing) throw HttpErr(404, "Ruleset not found");
      return c.json(await prisma.ruleset.update({ where: { id }, data }));
    }
    return c.json(await prisma.ruleset.create({ data }), 201);
  })
  .post("/", zValidator("json", schema.create.body), async (c) =>
    c.json(await prisma.ruleset.create({ data: c.req.valid("json") }), 201),
  )
  .put("/:id", mid.paramId, zValidator("json", schema.create.body), async (c) => {
    const { id } = c.req.valid("param");
    const existing = await prisma.ruleset.findUnique({ where: { id } });
    if (!existing) throw HttpErr(404, "Ruleset not found");
    return c.json(await prisma.ruleset.update({ where: { id }, data: c.req.valid("json") }));
  })
  .delete("/:id", mid.paramId, async (c) => {
    const { id } = c.req.valid("param");
    const existing = await prisma.ruleset.findUnique({ where: { id } });
    if (!existing) throw HttpErr(404, "Ruleset not found");
    return c.json(await prisma.ruleset.delete({ where: { id } }));
  });
