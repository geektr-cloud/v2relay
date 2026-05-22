import { Hono } from "hono";
import { prisma } from "@server/db";
import * as mid from "@server/middlewares";
import { zValidator } from "@hono/zod-validator";
import * as schema from "./schema";
import { type SubscriptionCacheStatus, SubscriptionRawContent } from "./raw-content";
import { HttpErr } from "@server/utils/http-errors";

async function getRawContentOfSubscription(
  id: string,
): Promise<{ response: Response; cacheStatus: SubscriptionCacheStatus }> {
  const sub = await prisma.subscription.findUnique({ where: { id } });
  if (!sub) throw HttpErr(404, "Subscription not found");
  if (!sub.enabled) throw HttpErr(403, "Subscription disabled");

  const content = new SubscriptionRawContent(sub.id, (sub.urls as string[]) ?? []);
  return content.get();
}

export const subscriptionRoutes = new Hono()
  .get("/", zValidator("query", schema.fetchAll.query), async (c) => {
    const { providerId, aggregate } = c.req.valid("query");
    const where = providerId ? { providerId } : {};
    const list = await prisma.subscription.findMany({
      where,
      include: aggregate ? { provider: true } : {},
      orderBy: { updatedAt: "desc" },
    });
    return c.json(list);
  })
  .get("/:id", mid.paramId, zValidator("query", schema.fetch.query), async (c) => {
    const { id } = c.req.valid("param");
    const { aggregate } = c.req.valid("query");
    const sub = await prisma.subscription.findUnique({
      where: { id },
      include: aggregate ? { provider: true } : {},
    });
    if (!sub) throw HttpErr(404, "Subscription not found");
    return c.json(sub);
  })
  .put("/", zValidator("json", schema.upsert.body), async (c) => {
    const { id, ...data } = c.req.valid("json");
    const provider = await prisma.provider.findUnique({ where: { id: data.providerId } });
    if (!provider) throw HttpErr(400, "Provider not found");
    if (id) {
      const existing = await prisma.subscription.findUnique({ where: { id } });
      if (!existing) throw HttpErr(404, "Subscription not found");
      return c.json(await prisma.subscription.update({ where: { id }, data }));
    }
    return c.json(await prisma.subscription.create({ data }), 201);
  })
  .post("/", zValidator("json", schema.create.body), async (c) => {
    const data = c.req.valid("json");
    const provider = await prisma.provider.findUnique({ where: { id: data.providerId } });
    if (!provider) throw HttpErr(400, "Provider not found");
    return c.json(await prisma.subscription.create({ data }), 201);
  })
  .put("/:id", mid.paramId, zValidator("json", schema.create.body), async (c) => {
    const { id } = c.req.valid("param");
    const existing = await prisma.subscription.findUnique({ where: { id } });
    if (!existing) throw HttpErr(404, "Subscription not found");

    const data = c.req.valid("json");
    const p = await prisma.provider.findUnique({ where: { id: data.providerId } });
    if (!p) throw HttpErr(400, "Provider not found");

    return c.json(await prisma.subscription.update({ where: { id }, data }));
  })
  .delete("/:id", mid.paramId, async (c) => {
    const { id } = c.req.valid("param");
    try {
      return c.json(await prisma.subscription.delete({ where: { id } }));
    } catch {
      throw HttpErr(404, "Subscription not found");
    }
  })
  .get("/:id/raw/status", mid.paramId, async (c) => {
    const { id } = c.req.valid("param");
    const { cacheStatus } = await getRawContentOfSubscription(id);
    return c.json(cacheStatus);
  })
  .get("/:id/raw", mid.paramId, async (c) => {
    const { id } = c.req.valid("param");
    const { response } = await getRawContentOfSubscription(id);
    return new Response(response.body, { headers: response.headers });
  })
  .get("/:id/readable", mid.paramId, async (c) => {
    const { id } = c.req.valid("param");
    const { response } = await getRawContentOfSubscription(id);

    let text = await response.text();
    try {
      text = atob(text);
    } catch {
      //
    }

    return new Response(text, { headers: response.headers });
  });
