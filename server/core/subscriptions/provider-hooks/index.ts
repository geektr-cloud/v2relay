import { jmsHook } from "./jms";
import type { ProviderHook } from "./types";

const providerHooks: ProviderHook[] = [jmsHook];

export function getProviderHooks(name: string): ProviderHook | undefined {
  return providerHooks.find((h) => h.name === name);
}
