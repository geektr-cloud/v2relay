import { Hono } from "hono";
import { env } from "cloudflare:workers";

import { providerRoutes } from "./routes/providers";
import { subscriptionRoutes } from "./routes/subscriptions";

export const h = new Hono();

h.route("/api/providers", providerRoutes);
h.route("/api/subscriptions", subscriptionRoutes);

h.get("/*", () => env.ASSETS.fetch("http://localhost/index.html"));

export default h;
