import { zValidator as zv } from '@hono/zod-validator'
import { validator } from 'hono/validator'
import z from 'zod';

export const paramId = zv('param', z.object({ id: z.uuid() }));
export const paramIdOrName = validator('param', (v, c) => {
    const { idOrName } = v;

    const r = z.union([z.uuid(), z.string().nonempty()]).safeParse(idOrName);
    if (!r.success) return c.json({ error: r.error.issues.map((i) => i.message).join("; ") }, 400);

    const isUUID = z.uuid().safeParse(idOrName).success;
    const where = isUUID ? { id: idOrName } : { name: idOrName };

    return {
        where,
        id: isUUID ? idOrName : undefined,
        name: isUUID ? undefined : idOrName,
    };
});
