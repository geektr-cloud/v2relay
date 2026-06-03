export interface AppConfigAdapter {
  serialize(): Promise<string>;
  send(): Promise<Response>;
}
