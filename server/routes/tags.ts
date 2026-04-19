import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "../db";
import * as mid from "../middlewares";
import { zValidator } from "@hono/zod-validator";

const keywordsInput = z
  .array(z.unknown())
  .optional()
  .default([])
  .transform((arr) => arr.map((v) => String(v).trim()).filter(Boolean));

const tagCreateSchema = z.object({
  name: z.string().trim().min(1, "name cannot be empty"),
  keywords: keywordsInput,
});

const tagPatchSchema = z
  .object({
    name: z.string().trim().min(1, "name cannot be empty").optional(),
    keywords: keywordsInput.optional(),
  })
  .refine((d) => d.name !== undefined || d.keywords !== undefined, { message: "No valid fields to update" });

export const tagRoutes = new Hono();

tagRoutes.get("/", async (c) => c.json(await prisma.tag.findMany({ orderBy: { name: "asc" } })));

tagRoutes.get("/:id", mid.paramId, async (c) => {
  const { id } = c.req.valid("param");
  const tag = await prisma.tag.findUnique({ where: { id } });
  return tag ? c.json(tag) : c.json({ error: "Tag not found" }, 404);
});

tagRoutes.post("/", zValidator("json", tagCreateSchema), async (c) => {
  try {
    const tag = await prisma.tag.create({ data: c.req.valid("json") });
    return c.json(tag, 201);
  } catch {
    return c.json({ error: "Tag creation failed (duplicate name?)" }, 400);
  }
});

tagRoutes.patch("/:id", mid.paramId, zValidator("json", tagPatchSchema), async (c) => {
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
