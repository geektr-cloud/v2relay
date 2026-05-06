import { Hono } from "hono";
import { prisma } from "../db";
import * as mid from "../middlewares";
import { zValidator } from "@hono/zod-validator";
import { schema } from "../core/subscriptions/schema";
import { SubscriptionRawContent, type SubscriptionCacheStatus } from "../core/subscriptions/raw-content";
import { HttpErr } from "../utils/http-errors";

const subscriptionInclude = { provider: true } as const;

export const subscriptionRoutes = new Hono();

subscriptionRoutes.get("/", async (c) => {
  const providerId = c.req.query("providerId");
  const where = providerId ? { providerId } : {};
  const list = await prisma.subscription.findMany({
    where,
    include: subscriptionInclude,
    orderBy: { updatedAt: "desc" },
  });
  return c.json(list);
});

subscriptionRoutes.get("/:id", mid.paramId, async (c) => {
  const { id } = c.req.valid("param");
  const sub = await prisma.subscription.findUnique({
    where: { id },
    include: subscriptionInclude,
  });
  if (!sub) throw HttpErr(404, "Subscription not found");
  return c.json(sub);
});

subscriptionRoutes.post("/", zValidator("json", schema), async (c) => {
  const body = c.req.valid("json");
  const provider = await prisma.provider.findUnique({ where: { id: body.providerId } });
  if (!provider) throw HttpErr(400, "Provider not found");

  const sub = await prisma.subscription.create({
    data: {
      ...body,
      enabled: body.enabled !== false,
    },
    include: subscriptionInclude,
  });
  return c.json(sub, 201);
});

subscriptionRoutes.put("/:id", mid.paramId, zValidator("json", schema), async (c) => {
  const { id } = c.req.valid("param");
  const existing = await prisma.subscription.findUnique({ where: { id } });
  if (!existing) throw HttpErr(404, "Subscription not found");

  const data = c.req.valid("json");
  const p = await prisma.provider.findUnique({ where: { id: data.providerId } });
  if (!p) throw HttpErr(400, "Provider not found");

  const sub = await prisma.subscription.update({ where: { id }, data, include: subscriptionInclude });
  return c.json(sub);
});

subscriptionRoutes.delete("/:id", mid.paramId, async (c) => {
  const { id } = c.req.valid("param");
  try {
    await prisma.subscription.delete({ where: { id } });
  } catch {
    throw HttpErr(404, "Subscription not found");
  }
  return c.body(null, 204);
});

// ---------- raw proxy ----------

/**
 * 解析订阅并交由 SubscriptionRawContent 处理缓存与上游拉取。
 * 若数据库中找不到订阅、订阅被禁用或所有 URL 都不可用，则抛出 HttpError 子类，
 * 由 server/index.ts 的 onError 统一转 JSON。
 */
async function getRawContentOfSubscription(
  id: string,
): Promise<{ response: Response; cacheStatus: SubscriptionCacheStatus }> {
  const sub = await prisma.subscription.findUnique({ where: { id } });
  if (!sub) throw HttpErr(404, "Subscription not found");
  if (!sub.enabled) throw HttpErr(403, "Subscription disabled");

  const content = new SubscriptionRawContent(sub.id, (sub.urls as string[]) ?? []);
  return content.get();
}

subscriptionRoutes.get("/:id/raw/status", mid.paramId, async (c) => {
  const { id } = c.req.valid("param");
  const { cacheStatus } = await getRawContentOfSubscription(id);
  return c.json(cacheStatus);
});

subscriptionRoutes.get("/:id/raw", mid.paramId, async (c) => {
  const { id } = c.req.valid("param");
  const { response } = await getRawContentOfSubscription(id);
  return new Response(response.body, { headers: response.headers });
});

subscriptionRoutes.get("/:id/readable", mid.paramId, async (c) => {
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
