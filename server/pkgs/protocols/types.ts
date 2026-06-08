export interface ProtocolStatic {
  // protocol name, e.g. "shadowsocks"
  readonly protocol: string;
  // test if the url is a valid protocol url
  testUrl(url: string): boolean;
  // test if the object is a valid clash-style protocol object
  testClash(object: object): boolean;
  // form the protocol from the url
  formUrl(url: string): Protocol;
  // form the protocol from a clash-style node object
  fromClash(object: object): Protocol;
}

export interface Protocol {
  // protocol name, e.g. "shadowsocks"
  readonly protocol: string;
  // name of the server, used for display and clash config
  name: string;
  // convert the protocol to the url
  toUrl(): string;
  // convert the protocol to the clash config
  toClash(): object | null;
  // convert the protocol to the v2ray config
  toV2Ray(): object | null;
  // get the server info
  getServerInfo(): {
    name: string;
    ip: string;
  };
}
