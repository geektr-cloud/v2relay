import { z } from "zod";

const name = z.string().trim().min(1, "name cannot be empty").max(32);
const keywords = z.array(z.string().trim()).optional().default([]);

export const schema = z.object({ name, keywords });
