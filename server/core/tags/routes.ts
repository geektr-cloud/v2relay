import { Hono } from "hono";
import { prisma } from "@server/db";
import * as mid from "@server/middlewares";
import { zValidator } from "@hono/zod-validator";
import * as schema from "./schema";
import { HttpErr } from "@server/utils/http-errors";
import { tagMatcher } from "./tag-matcher";

export const tagRoutes = new Hono()
  .get("/", async (c) => c.json(await prisma.tag.findMany({ orderBy: { name: "asc" } })))
  .get("/all", async (c) => {
    // Union of Tag.name + every distinct value in Node.tags (JSON string[] column).
    const [tags, nodes] = await Promise.all([
      prisma.tag.findMany({ select: { name: true } }),
      prisma.node.findMany({ select: { tags: true } }),
    ]);
    const set = new Set<string>();
    for (const t of tags) if (t.name) set.add(t.name);
    for (const n of nodes) {
      if (!Array.isArray(n.tags)) continue;
      for (const t of n.tags as string[]) if (t) set.add(t);
    }
    return c.json([...set].sort());
  })
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
