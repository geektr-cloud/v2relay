import { prisma } from "@server/db";
import { Prisma } from "@server/generated/prisma/client";
import type { Node } from "@server/generated/prisma/dto";

/**
 * 用 nodes 整体替换 subscriptionId 下的所有节点：
 *   1. 删除该订阅当前的全部 Node
 *   2. 插入 nodes 作为新记录；subscriptionId 强制覆盖为入参。
 *      调用方应提供稳定 id（如 uuid v5 派生）以保证再次拉取同一订阅的幂等性。
 *
 * 删除 + 写入在同一个事务里执行；任一步骤失败整体回滚。
 */
export async function batchUpdate(subscriptionId: string, nodes: Node[]): Promise<void> {
  const data = nodes.map((n) => ({ ...n, subscriptionId }));

  const ops: Prisma.PrismaPromise<unknown>[] = [prisma.node.deleteMany({ where: { subscriptionId } })];
  if (data.length > 0) {
    ops.push(prisma.node.createMany({ data }));
  }

  await prisma.$transaction(ops);
}
