import { Hono } from "hono";
import { env } from "cloudflare:workers";

import { providerRoutes } from "./routes/providers";
import { subscriptionRoutes } from "./routes/subscriptions";
import { tagRoutes } from "./routes/tags";
import { nodeRoutes } from "./routes/nodes";
import { ErrorHandler } from "./utils/http-errors";

export const h = new Hono();

h.onError(ErrorHandler);

h.route("/api/providers", providerRoutes);
h.route("/api/subscriptions", subscriptionRoutes);
h.route("/api/tags", tagRoutes);
h.route("/api/nodes", nodeRoutes);

h.get("/*", () => env.ASSETS.fetch("http://localhost/index.html"));

export default h;
