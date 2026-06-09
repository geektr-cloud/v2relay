import { Hono } from "hono";
import z from "zod";
import { prisma } from "@server/db";
import * as mid from "@server/middlewares";
import { zValidator } from "@hono/zod-validator";
import * as schema from "./schema";
import { HttpErr } from "@server/utils/http-errors";
import { RulesetManager } from "./ruleset-manager";

function idOrNameWhere(idOrName: string) {
  return z.uuid().safeParse(idOrName).success ? { id: idOrName } : { name: idOrName };
}

export const rulesetRoutes = new Hono()
  .get("/", async (c) => c.json(await prisma.ruleset.findMany({ orderBy: { updatedAt: "desc" } })))
  .get("/:idOrName", mid.paramIdOrName, async (c) => {
    const { idOrName } = c.req.valid("param");
    const item = await prisma.ruleset.findUnique({ where: idOrNameWhere(idOrName) });
    if (!item) throw HttpErr(404, "Ruleset not found");
    return c.json(item);
  })
  .put("/", zValidator("json", schema.upsert.body), async (c) => {
    const { id, ...data } = c.req.valid("json");
    if (id) {
      const existing = await prisma.ruleset.findUnique({ where: { id } });
      if (!existing) throw HttpErr(404, "Ruleset not found");
      return c.json(await prisma.ruleset.update({ where: { id }, data }));
    }
    return c.json(await prisma.ruleset.create({ data }), 201);
  })
  .post("/", zValidator("json", schema.create.body), async (c) =>
    c.json(await prisma.ruleset.create({ data: c.req.valid("json") }), 201),
  )
  .put("/:id", mid.paramId, zValidator("json", schema.create.body), async (c) => {
    const { id } = c.req.valid("param");
    const existing = await prisma.ruleset.findUnique({ where: { id } });
    if (!existing) throw HttpErr(404, "Ruleset not found");
    return c.json(await prisma.ruleset.update({ where: { id }, data: c.req.valid("json") }));
  })
  .delete("/:id", mid.paramId, async (c) => {
    const { id } = c.req.valid("param");
    const existing = await prisma.ruleset.findUnique({ where: { id } });
    if (!existing) throw HttpErr(404, "Ruleset not found");
    return c.json(await prisma.ruleset.delete({ where: { id } }));
  })
  .get("/:id/status", mid.paramId, async (c) => {
    const { id } = c.req.valid("param");
    const item = await prisma.ruleset.findUnique({ where: { id } });
    if (!item) throw HttpErr(404, "Ruleset not found");
    const handle = new RulesetManager(item);
    const result = await handle.get();
    return c.json(result.cacheStatus);
  })
  .get("/:id/content", mid.paramId, zValidator("query", schema.content.query), async (c) => {
    const { id } = c.req.valid("param");
    const { max_age } = c.req.valid("query");
    const item = await prisma.ruleset.findUnique({ where: { id } });
    if (!item) throw HttpErr(404, "Ruleset not found");
    const handle = new RulesetManager(item);
    const { response } = await handle.get({ maxAge: max_age });
    return new Response(response.body, { headers: response.headers });
  })
  .get("/:id/parsed", mid.paramId, zValidator("query", schema.parsed.query), async (c) => {
    const { id } = c.req.valid("param");
    const { max_age } = c.req.valid("query");
    const item = await prisma.ruleset.findUnique({ where: { id } });
    if (!item) throw HttpErr(404, "Ruleset not found");
    const handle = new RulesetManager(item);
    const { parsed } = await handle.getParsed({ maxAge: max_age });
    return c.json(parsed);
  })
  // 全局拉取：解析归类全部规则集并写入 KV 副本。
  // max_age 缺省 600s——十分钟内已更新过的规则集会被跳过，避免重复打上游。
  .post("/parsed", zValidator("query", schema.parsed.query), async (c) => {
    const { max_age } = c.req.valid("query");
    const maxAge = max_age ?? 600;
    const items = await prisma.ruleset.findMany();
    const results = await Promise.all(
      items.map(async (item) => {
        try {
          const { parsedStatus } = await new RulesetManager(item).getParsed({ maxAge });
          return { id: item.id, name: item.name, ok: true as const, counts: parsedStatus.counts };
        } catch (e) {
          return { id: item.id, name: item.name, ok: false as const, error: e instanceof Error ? e.message : String(e) };
        }
      }),
    );
    return c.json({ total: results.length, ok: results.filter((r) => r.ok).length, results });
  });
