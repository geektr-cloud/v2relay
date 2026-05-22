import { Hono } from "hono";
import { prisma } from "@server/db";
import * as mid from "@server/middlewares";
import { zValidator } from "@hono/zod-validator";
import * as schema from "./schema";
import { HttpErr } from "@server/utils/http-errors";
import type { Node } from "@server/generated/prisma/dto";

export const nodeRoutes = new Hono()
  .get("/", zValidator("query", schema.fetchAll.query), async (c) => {
    const { subscriptionId, aggregate } = c.req.valid("query");

    const list = await prisma.node.findMany({
      where: subscriptionId ? { subscriptionId } : {},
      include: aggregate ? { subscription: true } : {},
      orderBy: { name: "asc" },
    });

    return c.json(list);
  })
  .get("/:id", mid.paramId, zValidator("query", schema.fetch.query), async (c) => {
    const { id } = c.req.valid("param");
    const { aggregate } = c.req.valid("query");
    const node = await prisma.node.findUnique({
      where: { id },
      include: aggregate ? { subscription: true } : {},
    });
    if (!node) throw HttpErr(404, "Node not found");
    return c.json(node as Node);
  })
  .put("/", zValidator("json", schema.upsert.body), async (c) => {
    const { id, ...data } = c.req.valid("json");

    const sub = await prisma.subscription.count({ where: { id: data.subscriptionId } });
    if (sub === 0) throw HttpErr(400, "Subscription not found");

    if (id) {
      const existing = await prisma.node.findUnique({ where: { id } });
      if (!existing) throw HttpErr(404, "Node not found");
      return c.json(await prisma.node.update({ where: { id }, data: data }));
    }

    return c.json(await prisma.node.create({ data: data }), 201 as const);
  })
  .post("/", zValidator("json", schema.create.body), async (c) => {
    const data = c.req.valid("json");
    const sub = await prisma.subscription.count({ where: { id: data.subscriptionId } });
    if (!sub) throw HttpErr(400, "Subscription not found");
    const node = await prisma.node.create({ data });
    return c.json(node, 201 as const);
  })
  .put("/:id", mid.paramId, zValidator("json", schema.upsert.body), async (c) => {
    const { id } = c.req.valid("param");
    const existing = await prisma.node.findUnique({ where: { id } });
    if (!existing) throw HttpErr(404, "Node not found");
    const data = c.req.valid("json");
    const sub = await prisma.subscription.findUnique({ where: { id: data.subscriptionId } });
    if (!sub) throw HttpErr(400, "Subscription not found");
    const node = await prisma.node.update({ where: { id }, data: data });
    return c.json(node);
  })
  .delete("/:id", mid.paramId, async (c) => {
    const { id } = c.req.valid("param");
    try {
      const node = await prisma.node.delete({ where: { id } });
      return c.json(node);
    } catch {
      throw HttpErr(404, "Node not found");
    }
  });
