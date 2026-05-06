import { Hono } from "hono";
import { prisma } from "../db";
import * as mid from "../middlewares";
import { zValidator } from "@hono/zod-validator";
import { schema } from "../core/tags/schema";

export const tagRoutes = new Hono();

tagRoutes.get("/", async (c) => c.json(await prisma.tag.findMany({ orderBy: { name: "asc" } })));

tagRoutes.get("/:id", mid.paramId, async (c) => {
  const { id } = c.req.valid("param");
  const tag = await prisma.tag.findUnique({ where: { id } });
  return tag ? c.json(tag) : c.json({ error: "Tag not found" }, 404);
});

tagRoutes.post("/", zValidator("json", schema), async (c) => {
  try {
    const tag = await prisma.tag.create({ data: c.req.valid("json") });
    return c.json(tag, 201);
  } catch {
    return c.json({ error: "Tag creation failed (duplicate name?)" }, 400);
  }
});

tagRoutes.put("/:id", mid.paramId, zValidator("json", schema), async (c) => {
  const { id } = c.req.valid("param");
  const existing = await prisma.tag.findUnique({ where: { id } });
  if (!existing) return c.json({ error: "Tag not found" }, 404);
  try {
    const tag = await prisma.tag.update({ where: { id }, data: c.req.valid("json") });
    return c.json(tag);
  } catch {
    return c.json({ error: "Update failed (duplicate name?)" }, 400);
  }
});

tagRoutes.delete("/:id", mid.paramId, async (c) => {
  const { id } = c.req.valid("param");
  try {
    await prisma.tag.delete({ where: { id } });
  } catch {
    return c.json({ error: "Tag not found" }, 404);
  }
  return c.body(null, 204);
});
