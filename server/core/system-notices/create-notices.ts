import { NIL, v5 as uuidv5 } from "uuid";
import { prisma } from "@server/db";

/** uuid v5 namespace for deterministic notice ids (derived once from NIL UUID) */
const uuidNoticeNS = uuidv5("notice", NIL);

/** key → uuid v5 (namespace = {@link uuidNoticeNS}) */
const idFor = (key: string): string => uuidv5(key, uuidNoticeNS);

/** 构造一条 upsert prisma promise（供单条与批量复用，未立即执行） */
const upsertOp = (key: string, message: string) => {
  const id = idFor(key);
  return prisma.systemNotice.upsert({
    where: { id },
    create: { id, message },
    update: { message },
  });
};

/**
 * 写入 / 更新单条系统通知。同一 `key` 总是映射到同一 uuid v5
 *（namespace 为 {@link uuidNoticeNS}），重复调用即为更新而非新增。
 *
 * 重载：
 *   - `createNotice(key, message)`  — 显式去重键
 *   - `createNotice(message)`       — 用 message 自身作为去重键，
 *                                     适合"内容相同视为同一条"的告警场景
 */
export function createNotice(key: string, message: string): ReturnType<typeof upsertOp>;
export function createNotice(message: string): ReturnType<typeof upsertOp>;
export function createNotice(a: string, b?: string) {
  const [key, message] = b === undefined ? [a, a] : [a, b];
  return upsertOp(key, message);
}

/**
 * 批量写入 / 更新系统通知。id 派生方式与 {@link createNotice} 一致。
 *
 * 重载：
 *   - `createNotices(Map<key, message>)` — 显式去重键
 *   - `createNotices(Set<message>)`       — 用 message 自身作为去重键
 *
 * 整组写入在一次 `$transaction` 中执行，任一条失败整体回滚；
 * 空入参时不发起任何查询。
 */
export async function createNotices(notices: Map<string, string>): Promise<void>;
export async function createNotices(notices: Set<string>): Promise<void>;
export async function createNotices(notices: Map<string, string> | Set<string>): Promise<void> {
  if (notices.size === 0) return;
  const entries: Array<[string, string]> =
    notices instanceof Map ? [...notices] : [...notices].map((m) => [m, m] as [string, string]);
  const ops = entries.map(([key, message]) => upsertOp(key, message));
  await prisma.$transaction(ops);
}
