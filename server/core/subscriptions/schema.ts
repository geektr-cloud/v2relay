import { z } from "zod";

const providerId = z.string().trim().min(1);
const urls = z.array(z.string().trim().url()).min(1);
const enabled = z.boolean();
const name = z.string().trim().max(64);
const remark = z.string().trim().max(512);

export const schema = z.object({ providerId, urls, enabled, name, remark });
