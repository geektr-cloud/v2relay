import { Hono } from "hono";
import { prisma } from "@server/db";
import * as mid from "@server/middlewares";
import { zValidator } from "@hono/zod-validator";
import * as schema from "./schema";
import { HttpErr } from "@server/utils/http-errors";
import { tagMatcher } from "./tag-matcher";

export const tagRoutes = new Hono()
  .get("/", async (c) => c.json(await prisma.tag.findMany({ orderBy: { name: "asc" } })))
  .get("/:id", mid.paramId, async (c) => {
    const { id } = c.req.valid("param");
    const tag = await prisma.tag.findUnique({ where: { id } });
    if (!tag) throw HttpErr(404, "Tag not found");
    return c.json(tag);
  })
  .post("/", zValidator("json", schema.create.body), async (c) => {
    try {
      const tag = await prisma.tag.create({ data: c.req.valid("json") });
      tagMatcher.refresh();
      return c.json(tag, 201 as const);
    } catch {
      throw HttpErr(400, "Tag creation failed (duplicate name?)");
    }
  })
  .put("/", zValidator("json", schema.upsert.body), async (c) => {
    const { id, ...data } = c.req.valid("json");
    if (id) {
      const existing = await prisma.tag.findUnique({ where: { id } });
      if (!existing) throw HttpErr(404, "Tag not found");
      try {
        const tag = await prisma.tag.update({ where: { id }, data });
        tagMatcher.refresh();
        return c.json(tag);
      } catch {
        throw HttpErr(400, "Update failed (duplicate name?)");
      }
    }
    try {
      const tag = await prisma.tag.create({ data });
      tagMatcher.refresh();
      return c.json(tag);
    } catch {
      throw HttpErr(400, "Tag creation failed (duplicate name?)");
    }
  })
  .put("/:id", mid.paramId, zValidator("json", schema.create.body), async (c) => {
    const { id } = c.req.valid("param");
    const existing = await prisma.tag.findUnique({ where: { id } });
    if (!existing) throw HttpErr(404, "Tag not found");
    try {
      const tag = await prisma.tag.update({ where: { id }, data: c.req.valid("json") });
      tagMatcher.refresh();
      return c.json(tag);
    } catch {
      throw HttpErr(400, "Update failed (duplicate name?)");
    }
  })
  .delete("/:id", mid.paramId, async (c) => {
    const { id } = c.req.valid("param");
    try {
      const tag = await prisma.tag.delete({ where: { id } });
      tagMatcher.refresh();
      return c.json(tag);
    } catch {
      throw HttpErr(404, "Tag not found");
    }
  });
