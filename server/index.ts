import { Hono } from "hono";
import { env } from "cloudflare:workers";

import { PrismaClient } from './generated/prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';

const adapter = new PrismaD1(env.DB);
const prisma = new PrismaClient({ adapter });

export const h = new Hono();

const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id);

h.get("/api/providers", async (c) => {
    const providers = await prisma.provider.findMany();
    return c.json(providers);
});

h.get("/api/providers/:idOrName", async (c) => {
    const { idOrName } = c.req.param();
    const provider = await prisma.provider.findUnique({ where: isUUID(idOrName) ? { id: idOrName } : { name: idOrName } });
    return provider ? c.json(provider) : c.json({ error: "Provider not found" }, 404);
});

h.post("/api/providers", async (c) => {
    const { name, url } = await c.req.json();
    const provider = await prisma.provider.create({ data: { name, url } });
    return c.json(provider);
});
// fetch("/api/providers", { method: "POST", body: JSON.stringify({ name: "Test", url: "https://test.com" }) })

h.get("/api/*", (c) => c.json({ name: "Cloudflare" }));

h.get("/*", () => env.ASSETS.fetch("http://localhost/index.html"));

export default h;
