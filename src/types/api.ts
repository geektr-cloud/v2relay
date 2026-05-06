import type {
  Provider,
  Subscription as PrismaSubscription,
  Tag as PrismaTag,
  Node as PrismaNode,
} from "@server/generated/prisma/client";
export type { Provider };

export type Subscription = Omit<PrismaSubscription, "urls"> & {
  urls: string[];
};

export type SubscriptionWithProvider = Subscription & {
  provider: Provider;
};

export type Tag = Omit<PrismaTag, "keywords"> & {
  keywords: string[];
};

export type Node = Omit<PrismaNode, "tags" | "connInfo"> & {
  tags: string[];
  connInfo: Record<string, unknown>;
};

export type NodeWithSubscription = Node & {
  subscription: SubscriptionWithProvider;
};
