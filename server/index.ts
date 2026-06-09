import { Hono } from "hono";
import { env } from "cloudflare:workers";

import { providerRoutes } from "@server/core/providers/routes";
import { subscriptionRoutes } from "@server/core/subscriptions/routes";
import { tagRoutes } from "@server/core/tags/routes";
import { nodeRoutes } from "@server/core/nodes/routes";
import { systemNoticeRoutes } from "@server/core/system-notices/routes";
import { rulesetRoutes } from "@server/core/rulesets/routes";
import { appConfigRoutes } from "@server/core/app-configs/routes";
import { routeRoutes } from "@server/core/routes/routes";
import { authRoutes } from "@server/core/auth/routes";
import { staticFileRoutes, publicStaticFileRoutes } from "@server/core/static-files/routes";
import { ClashConfigAdapter, type ClashConfigData } from "@server/core/app-configs/adapter/clash";
import { prisma } from "@server/db";
import { requireAuth } from "@server/middlewares/auth";
import { ErrorHandler, HttpErr } from "@server/utils/http-errors";

export const app = new Hono()
  .use("/api/*", requireAuth)
  .route("/api/auth", authRoutes)
  .route("/api/providers", providerRoutes)
  .route("/api/subscriptions", subscriptionRoutes)
  .route("/api/tags", tagRoutes)
  .route("/api/nodes", nodeRoutes)
  .route("/api/system-notices", systemNoticeRoutes)
  .route("/api/rulesets", rulesetRoutes)
  .route("/api/app-configs", appConfigRoutes)
  .route("/api/routes", routeRoutes)
  .route("/api/static-files", staticFileRoutes)
  .route("/files", publicStaticFileRoutes)
  .get("/sub/:token", async (c) => {
    const token = c.req.param("token");
    if (!token) throw HttpErr(404, "not found");
    const item = await prisma.appConfig.findFirst({ where: { apiToken: token } });
    if (!item) throw HttpErr(404, "not found");
    const filter = item.nodeFilter as import("@server/core/nodes/node-filter").Filter;
    const displayName = item.overrideName || item.name;
    if (item.type === "clash") {
      const adapter = new ClashConfigAdapter(
        item.template,
        item.config as ClashConfigData,
        filter,
        displayName,
        item.keepNoResolve,
      );
      return adapter.send();
    }
    throw HttpErr(400, "type not supported");
  });

export type AppType = typeof app;

app.onError(ErrorHandler);
app.get("/*", () => env.ASSETS.fetch("http://localhost/index.html"));

export default app;
