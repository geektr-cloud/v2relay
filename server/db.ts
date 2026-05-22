import { env } from "cloudflare:workers";
import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient } from "@server/generated/prisma/client";

const adapter = new PrismaD1(env.DB);
export const prisma = new PrismaClient({ adapter });
