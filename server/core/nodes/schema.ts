import { z } from "zod";
import { validJson } from "../../utils/zod";

// ── field definitions ─────────────────────────────────────────────────────────

const subscriptionId = z.uuid();
const name = z.string().trim().max(64);
const protocol = z.string().trim().max(32);
const remark = z.string().trim().max(512);
const ip = z.union([z.ipv4(), z.ipv6()]);
const priceRate = z.number().min(0);
const tags = z.array(z.string().trim());
const connInfo = validJson();

// ── single schema for create, update, and client-side form validation ─────────

export const schema = z.object({ subscriptionId, name, protocol, remark, ip, priceRate, tags, connInfo });
