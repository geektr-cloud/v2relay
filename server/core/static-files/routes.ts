import { Hono } from "hono";
import z from "zod";
import { prisma } from "@server/db";
import * as mid from "@server/middlewares";
import { zValidator } from "@hono/zod-validator";
import * as schema from "./schema";
import { HttpErr } from "@server/utils/http-errors";
import { StaticFileManager } from "./static-file-manager";

function idOrNameWhere(idOrName: string) {
  return z.uuid().safeParse(idOrName).success ? { id: idOrName } : { name: idOrName };
}

export const staticFileRoutes = new Hono()
  .get("/", async (c) => c.json(await prisma.staticFile.findMany({ orderBy: { name: "asc" } })))
  .get("/:idOrName", mid.paramIdOrName, async (c) => {
    const { idOrName } = c.req.valid("param");
    const item = await prisma.staticFile.findUnique({ where: idOrNameWhere(idOrName) });
    if (!item) throw HttpErr(404, "StaticFile not found");
    return c.json(item);
  })
  .put("/", zValidator("json", schema.upsert.body), async (c) => {
    const { id, ...data } = c.req.valid("json");
    if (id) {
      const existing = await prisma.staticFile.findUnique({ where: { id } });
      if (!existing) throw HttpErr(404, "StaticFile not found");
      return c.json(await prisma.staticFile.update({ where: { id }, data }));
    }
    return c.json(await prisma.staticFile.create({ data }), 201);
  })
  .post("/", zValidator("json", schema.create.body), async (c) =>
    c.json(await prisma.staticFile.create({ data: c.req.valid("json") }), 201),
  )
  .put("/:id", mid.paramId, zValidator("json", schema.create.body), async (c) => {
    const { id } = c.req.valid("param");
    const existing = await prisma.staticFile.findUnique({ where: { id } });
    if (!existing) throw HttpErr(404, "StaticFile not found");
    return c.json(await prisma.staticFile.update({ where: { id }, data: c.req.valid("json") }));
  })
  .delete("/:id", mid.paramId, async (c) => {
    const { id } = c.req.valid("param");
    const existing = await prisma.staticFile.findUnique({ where: { id } });
    if (!existing) throw HttpErr(404, "StaticFile not found");
    return c.json(await prisma.staticFile.delete({ where: { id } }));
  })
  .get("/:id/status", mid.paramId, async (c) => {
    const { id } = c.req.valid("param");
    const item = await prisma.staticFile.findUnique({ where: { id } });
    if (!item) throw HttpErr(404, "StaticFile not found");
    const handle = new StaticFileManager(item);
    const { cacheStatus } = await handle.get();
    return c.json(cacheStatus);
  })
  .get("/:id/content", mid.paramId, zValidator("query", schema.content.query), async (c) => {
    const { id } = c.req.valid("param");
    const { force_reload } = c.req.valid("query");
    const item = await prisma.staticFile.findUnique({ where: { id } });
    if (!item) throw HttpErr(404, "StaticFile not found");
    const handle = new StaticFileManager(item);
    const { response } = await handle.get({ forceReload: force_reload });
    return new Response(response.body, { headers: response.headers });
  });

export const publicStaticFileRoutes = new Hono()
  .get("/:idOrName", mid.paramIdOrName, async (c) => {
    const { idOrName } = c.req.valid("param");
    const item = await prisma.staticFile.findUnique({ where: idOrNameWhere(idOrName) });
    if (!item) throw HttpErr(404, "not found");
    const handle = new StaticFileManager(item);
    const { response } = await handle.get();
    return new Response(response.body, { headers: response.headers });
  })
  .get("/:idOrName/sha256", mid.paramIdOrName, async (c) => {
    const { idOrName } = c.req.valid("param");
    const item = await prisma.staticFile.findUnique({ where: idOrNameWhere(idOrName) });
    if (!item) throw HttpErr(404, "not found");
    const handle = new StaticFileManager(item);
    const { cacheStatus } = await handle.get();
    return new Response(cacheStatus.sha256, { headers: { "content-type": "text/plain; charset=utf-8" } });
  });
