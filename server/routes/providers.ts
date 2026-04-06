import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "../db";
import * as mid from "../middlewares";
import { zValidator } from "@hono/zod-validator";

/** Accepts missing / null; stores empty string when absent or cleared. */
const providerUrlInput = z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => (v == null ? "" : String(v).trim()));

export const providerRoutes = new Hono();

providerRoutes.get("/", async (c) => c.json(await prisma.provider.findMany()));

providerRoutes.get("/:idOrName", mid.paramIdOrName, async (c) => {
    const { where } = c.req.valid('param');
    const provider = await prisma.provider.findUnique({ where });

    if (!provider) return c.json({ error: "Provider not found" }, 404);

    return c.json(provider);
});

const providerCreateSchema = z.object({
    name: z.string().trim().min(1, "name cannot be empty"),
    url: providerUrlInput,
});

providerRoutes.post("/", zValidator('json', providerCreateSchema), async (c) =>
    c.json(await prisma.provider.create({ data: c.req.valid('json') }))
);

const providerPatchSchema = z
    .object({
        name: z.string().trim().min(1, "name cannot be empty").optional(),
        url: providerUrlInput.optional(),
    })
    .refine((d) => d.name !== undefined || d.url !== undefined, {
        message: "No valid fields to update",
    });

providerRoutes.patch("/:idOrName", mid.paramIdOrName, zValidator('json', providerPatchSchema), async (c) => {
    const { where } = c.req.valid('param');
    const provider = await prisma.provider.findUnique({ where });

    if (!provider) return c.json({ error: "Provider not found" }, 404);

    const data = c.req.valid('json');
    return c.json(await prisma.provider.update({ where, data }));
});

providerRoutes.delete("/:idOrName", mid.paramIdOrName, async (c) => {
    const { where } = c.req.valid('param');
    const provider = await prisma.provider.findUnique({ where });

    if (!provider) return c.json({ error: "Provider not found" }, 404);

    return c.json(await prisma.provider.delete({ where }));
});
