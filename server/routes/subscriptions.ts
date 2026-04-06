import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "../db";
import * as mid from "../middlewares";
import { zValidator } from "@hono/zod-validator";

const subscriptionInclude = { provider: true } as const;

const subscriptionUrlsCreate = z
    .array(z.unknown())
    .transform((arr) => arr.map((u) => String(u).trim()).filter(Boolean))
    .pipe(
        z
            .array(z.string())
            .min(1, "urls must contain at least one non-empty URL"),
    );

const remarkInput = z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => (v == null || v === undefined ? "" : String(v).trim()));

const subscriptionCreateSchema = z.object({
    providerId: z.string().min(1, "providerId is required"),
    urls: subscriptionUrlsCreate,
    enabled: z.boolean().optional(),
    name: z.string().trim().optional().default(""),
    remark: remarkInput,
});

const subscriptionPatchUrls = z
    .array(z.unknown())
    .optional()
    .transform((arr) =>
        arr === undefined
            ? undefined
            : arr.map((u) => String(u).trim()).filter(Boolean),
    )
    .refine(
        (v) => v === undefined || v.length > 0,
        { message: "urls cannot be empty" },
    );

const subscriptionRemarkPatch = z
    .union([z.string(), z.null(), z.undefined()])
    .optional()
    .transform((v) => {
        if (v === undefined) {
            return undefined;
        }
        return v == null ? "" : String(v).trim();
    });

const subscriptionPatchSchema = z
    .object({
        providerId: z.string().optional(),
        urls: subscriptionPatchUrls,
        enabled: z.boolean().optional(),
        name: z.string().trim().optional(),
        remark: subscriptionRemarkPatch,
    })
    .refine(
        (d) =>
            d.providerId !== undefined ||
            d.urls !== undefined ||
            d.enabled !== undefined ||
            d.name !== undefined ||
            d.remark !== undefined,
        { message: "No valid fields to update" },
    );

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
    return sub
        ? c.json(sub)
        : c.json({ error: "Subscription not found" }, 404);
});

subscriptionRoutes.post(
    "/",
    zValidator("json", subscriptionCreateSchema),
    async (c) => {
        const body = c.req.valid("json");
        const provider = await prisma.provider.findUnique({
            where: { id: body.providerId },
        });
        if (!provider) {
            return c.json({ error: "Provider not found" }, 400);
        }
        const sub = await prisma.subscription.create({
            data: {
                ...body,
                enabled: body.enabled !== false,
            },
            include: subscriptionInclude,
        });
        return c.json(sub, 201);
    },
);

subscriptionRoutes.patch(
    "/:id",
    mid.paramId,
    zValidator("json", subscriptionPatchSchema),
    async (c) => {
        const { id } = c.req.valid("param");
        const existing = await prisma.subscription.findUnique({ where: { id } });
        if (!existing) {
            return c.json({ error: "Subscription not found" }, 404);
        }
        const data = c.req.valid("json");
        if (data.providerId !== undefined) {
            const p = await prisma.provider.findUnique({
                where: { id: data.providerId },
            });
            if (!p) {
                return c.json({ error: "Provider not found" }, 400);
            }
        }
        const sub = await prisma.subscription.update({
            where: { id },
            data,
            include: subscriptionInclude,
        });
        return c.json(sub);
    },
);

subscriptionRoutes.delete("/:id", mid.paramId, async (c) => {
    const { id } = c.req.valid("param");
    try {
        await prisma.subscription.delete({ where: { id } });
    } catch {
        return c.json({ error: "Subscription not found" }, 404);
    }
    return c.body(null, 204);
});
