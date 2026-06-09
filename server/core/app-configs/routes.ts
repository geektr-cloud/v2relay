import { Hono } from "hono";
import z from "zod";
import { prisma } from "@server/db";
import * as mid from "@server/middlewares";
import { zValidator } from "@hono/zod-validator";
import * as schema from "./schema";
import { HttpErr } from "@server/utils/http-errors";
import { ClashConfigAdapter, type ClashConfigData } from "./adapter/clash";

function idOrNameWhere(idOrName: string) {
  return z.uuid().safeParse(idOrName).success ? { id: idOrName } : { name: idOrName };
}

export const appConfigRoutes = new Hono()
  .get("/", async (c) => c.json(await prisma.appConfig.findMany()))
  .get("/:idOrName", mid.paramIdOrName, async (c) => {
    const { idOrName } = c.req.valid("param");
    const item = await prisma.appConfig.findUnique({ where: idOrNameWhere(idOrName) });
    if (!item) throw HttpErr(404, "AppConfig not found");
    return c.json(item);
  })
  .put("/", zValidator("json", schema.upsert.body), async (c) => {
    const { id, ...data } = c.req.valid("json");
    if (id) {
      const existing = await prisma.appConfig.findUnique({ where: { id } });
      if (!existing) throw HttpErr(404, "AppConfig not found");
      return c.json(await prisma.appConfig.update({ where: { id }, data }));
    }
    return c.json(await prisma.appConfig.create({ data }), 201);
  })
  .post("/", zValidator("json", schema.create.body), async (c) =>
    c.json(await prisma.appConfig.create({ data: c.req.valid("json") }), 201),
  )
  .put("/:id", mid.paramId, zValidator("json", schema.create.body), async (c) => {
    const { id } = c.req.valid("param");
    const existing = await prisma.appConfig.findUnique({ where: { id } });
    if (!existing) throw HttpErr(404, "AppConfig not found");
    return c.json(await prisma.appConfig.update({ where: { id }, data: c.req.valid("json") }));
  })
  .delete("/:id", mid.paramId, async (c) => {
    const { id } = c.req.valid("param");
    const existing = await prisma.appConfig.findUnique({ where: { id } });
    if (!existing) throw HttpErr(404, "AppConfig not found");
    return c.json(await prisma.appConfig.delete({ where: { id } }));
  })
  .post("/:id/rotate-api-token", mid.paramId, async (c) => {
    const { id } = c.req.valid("param");
    const existing = await prisma.appConfig.findUnique({ where: { id } });
    if (!existing) throw HttpErr(404, "AppConfig not found");
    return c.json(await prisma.appConfig.update({ where: { id }, data: { apiToken: crypto.randomUUID() } }));
  })
  .get("/:id/sub", mid.paramId, async (c) => {
    const { id } = c.req.valid("param");
    const item = await prisma.appConfig.findUnique({ where: { id } });
    if (!item) throw HttpErr(404, "AppConfig not found");
    const filter = item.nodeFilter as import("@server/core/nodes/node-filter").Filter;
    const displayName = item.overrideName || item.name;
    if (item.type === "clash") {
      const adapter = new ClashConfigAdapter(item.template, item.config as ClashConfigData, filter, displayName);
      return adapter.send();
    }
    throw HttpErr(400, "type not supported");
  });
