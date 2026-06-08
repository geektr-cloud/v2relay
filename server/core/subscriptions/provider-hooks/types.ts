import type { Protocol } from "@server/pkgs/protocols";
import type { Node } from "../../nodes/schema";
import type { AggregatedSubscription } from "../schema";

export type ProtocalHook = (subscription: AggregatedSubscription, protocols: Protocol[]) => Protocol[];
export type NodesHook = (subscription: AggregatedSubscription, nodes: Node[]) => Node[];

export interface ProviderHook {
  name: string;
  rewriteProtocols?: ProtocalHook;
  rewriteNodes?: NodesHook;
}
