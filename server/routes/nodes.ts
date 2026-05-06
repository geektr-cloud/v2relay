import { Hono } from "hono";
import { prisma } from "../db";
import * as mid from "../middlewares";
import { zValidator } from "@hono/zod-validator";
import { schema } from "../core/nodes/schema";

const nodeInclude = { subscription: { include: { provider: true } } } as const;

export const nodeRoutes = new Hono();

nodeRoutes.get("/", async (c) => {
  const subscriptionId = c.req.query("subscriptionId");
  const where = subscriptionId ? { subscriptionId } : {};
  const list = await prisma.node.findMany({
    where,
    include: nodeInclude,
    orderBy: { name: "asc" },
  });
  return c.json(list);
});

nodeRoutes.get("/:id", mid.paramId, async (c) => {
  const { id } = c.req.valid("param");
  const node = await prisma.node.findUnique({ where: { id }, include: nodeInclude });
  return node ? c.json(node) : c.json({ error: "Node not found" }, 404);
});

nodeRoutes.post("/", zValidator("json", schema), async (c) => {
  const body = c.req.valid("json");
  const sub = await prisma.subscription.findUnique({ where: { id: body.subscriptionId } });
  if (!sub) return c.json({ error: "Subscription not found" }, 400);
  const node = await prisma.node.create({ data: body, include: nodeInclude });
  return c.json(node, 201);
});

nodeRoutes.put("/:id", mid.paramId, zValidator("json", schema), async (c) => {
  const { id } = c.req.valid("param");
  const existing = await prisma.node.findUnique({ where: { id } });
  if (!existing) return c.json({ error: "Node not found" }, 404);
  const data = c.req.valid("json");
  const sub = await prisma.subscription.findUnique({ where: { id: data.subscriptionId } });
  if (!sub) return c.json({ error: "Subscription not found" }, 400);
  const node = await prisma.node.update({ where: { id }, data, include: nodeInclude });
  return c.json(node);
});

nodeRoutes.delete("/:id", mid.paramId, async (c) => {
  const { id } = c.req.valid("param");
  try {
    await prisma.node.delete({ where: { id } });
  } catch {
    return c.json({ error: "Node not found" }, 404);
  }
  return c.body(null, 204);
});
