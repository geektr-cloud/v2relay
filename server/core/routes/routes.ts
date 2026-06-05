import { Hono } from "hono";
import z from "zod";
import { prisma } from "@server/db";
import * as mid from "@server/middlewares";
import { zValidator } from "@hono/zod-validator";
import * as schema from "./schema";
import { HttpErr } from "@server/utils/http-errors";
import { filterNodes, type Filter } from "../nodes/node-filter";

function idOrNameWhere(idOrName: string) {
  return z.uuid().safeParse(idOrName).success ? { id: idOrName } : { name: idOrName };
}

export const routeRoutes = new Hono()
  .get("/", async (c) => c.json(await prisma.route.findMany({ orderBy: { name: "asc" } })))
  .get("/:idOrName", mid.paramIdOrName, async (c) => {
    const { idOrName } = c.req.valid("param");
    const item = await prisma.route.findUnique({ where: idOrNameWhere(idOrName) });
    if (!item) throw HttpErr(404, "Route not found");
    return c.json(item);
  })
  .put("/", zValidator("json", schema.upsert.body), async (c) => {
    const { id, ...data } = c.req.valid("json");
    if (id) {
      const existing = await prisma.route.findUnique({ where: { id } });
      if (!existing) throw HttpErr(404, "Route not found");
      return c.json(await prisma.route.update({ where: { id }, data }));
    }
    return c.json(await prisma.route.create({ data }), 201);
  })
  .post("/", zValidator("json", schema.create.body), async (c) =>
    c.json(await prisma.route.create({ data: c.req.valid("json") }), 201),
  )
  .put("/:id", mid.paramId, zValidator("json", schema.create.body), async (c) => {
    const { id } = c.req.valid("param");
    const existing = await prisma.route.findUnique({ where: { id } });
    if (!existing) throw HttpErr(404, "Route not found");
    return c.json(await prisma.route.update({ where: { id }, data: c.req.valid("json") }));
  })
  .delete("/:id", mid.paramId, async (c) => {
    const { id } = c.req.valid("param");
    const existing = await prisma.route.findUnique({ where: { id } });
    if (!existing) throw HttpErr(404, "Route not found");
    return c.json(await prisma.route.delete({ where: { id } }));
  })
  .get("/:id/preview", mid.paramId, async (c) => {
    const { id } = c.req.valid("param");
    const item = await prisma.route.findUnique({ where: { id } });
    if (!item) throw HttpErr(404, "Route not found");
    const all = await prisma.node.findMany({ orderBy: { name: "asc" } });
    const matched = filterNodes(all, item.filter as Filter);
    return c.json(matched.map((n) => ({ id: n.id, name: n.name, subscriptionId: n.subscriptionId })));
  });
