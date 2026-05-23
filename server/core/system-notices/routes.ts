import { Hono } from "hono";
import { prisma } from "@server/db";
import * as mid from "@server/middlewares";
import { HttpErr } from "@server/utils/http-errors";

export const systemNoticeRoutes = new Hono()
  .get("/", async (c) => {
    const list = await prisma.systemNotice.findMany({ orderBy: { createdAt: "desc" } });
    return c.json(list);
  })
  .delete("/", async (c) => {
    const { count } = await prisma.systemNotice.deleteMany();
    return c.json({ count });
  })
  .delete("/:id", mid.paramId, async (c) => {
    const { id } = c.req.valid("param");
    try {
      return c.json(await prisma.systemNotice.delete({ where: { id } }));
    } catch {
      throw HttpErr(404, "SystemNotice not found");
    }
  });
