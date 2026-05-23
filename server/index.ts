import { Hono } from "hono";
import { env } from "cloudflare:workers";

import { providerRoutes } from "@server/core/providers/routes";
import { subscriptionRoutes } from "@server/core/subscriptions/routes";
import { tagRoutes } from "@server/core/tags/routes";
import { nodeRoutes } from "@server/core/nodes/routes";
import { systemNoticeRoutes } from "@server/core/system-notices/routes";
import { ErrorHandler } from "@server/utils/http-errors";

export const app = new Hono()
  .route("/api/providers", providerRoutes)
  .route("/api/subscriptions", subscriptionRoutes)
  .route("/api/tags", tagRoutes)
  .route("/api/nodes", nodeRoutes)
  .route("/api/system-notices", systemNoticeRoutes);

export type AppType = typeof app;

app.onError(ErrorHandler);
app.get("/*", () => env.ASSETS.fetch("http://localhost/index.html"));

export default app;
