import { z } from "zod";

const name = z.string().trim().min(1).max(32);
const url = z.union([z.literal(""), z.url()]);

export const schema = z.object({ name, url });
