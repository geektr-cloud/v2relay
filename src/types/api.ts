import type { Provider, Subscription as PrismaSubscription } from '@server/generated/prisma/client'
export type { Provider }

export type Subscription = Omit<PrismaSubscription, 'urls'> & {
  urls: string[]
}

export type SubscriptionWithProvider = Subscription & {
  provider: Provider
}
