import type { Provider, Subscription as PrismaSubscription, Tag as PrismaTag } from "@server/generated/prisma/client";
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
