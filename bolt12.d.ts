import { bech32, hex } from '@scure/base';

// Network configurations
declare const DEFAULTNETWORK: {
  bech32: 'bc';
  pubKeyHash: 0x00;
  scriptHash: 0x05;
  validWitnessVersions: [0];
};
declare const TESTNETWORK: {
  bech32: 'tb',
  pubKeyHash: 0x6f,
  scriptHash: 0xc4,
  validWitnessVersions: [0],
};
declare const SIGNETNETWORK: {
  bech32: 'tbs';
  pubKeyHash: 0x6f;
  scriptHash: 0xc4;
  validWitnessVersions: [0];
};
declare const REGTESTNETWORK: {
  bech32: 'bcrt';
  pubKeyHash: 0x6f;
  scriptHash: 0xc4;
  validWitnessVersions: [0];
};
declare const SIMNETWORK: {
  bech32: 'sim';
  pubKeyHash: 0x6f;
  scriptHash: 0xc4;
  validWitnessVersions: [0];
};
declare const FEATUREBIT_ORDER: [
  'option_data_loss_protect',
  'initial_routing_sync',
  'option_upfront_shutdown_script',
  'gossip_queries',
  'var_onion_optin',
  'gossip_queries_ex',
  'option_static_remotekey',
  'payment_secret',
  'basic_mpp',
  'option_support_large_channel'
];
declare const DIVISORS: {
  m: bigint;
  u: bigint;
  n: bigint;
  p: bigint;
};  
declare const BigInt: {
m: 1000n,
u: 1000000n,  
n: 1000000000n,
p: 1000000000000n
};
declare const MAX_MILLISATS: bigint;
declare const MILLISATS_PER_BTC: bigint;

declare const TAGCODES: {
  offer_id: 1,
  path_offer: 2,
  offer_issuer_id: 3,
  offer_issuer_node_id: 4,
  offer_issuer_signature: 5,
  onion_message: 10,
  invoice_request: 7,
  invreq_metadata: 8,
  payment_hash: 1,
  payment_secret: 16,
  description: 13,
  payee: 19,
  description_hash: 23,
  expiry: 6,
  min_final_cltv_expiry: 24,
  fallback_address: 9,
  route_hint: 3,
  feature_bits: 5,
  metadata: 27,
};
declare const TAGNAMES: Record<number, string>;
declare const TAGPARSERS: {
  1: (words: number[]) => string;
  16: (words: number[]) => string;
  13: (words: number[]) => string;
  19: (words: number[]) => string;
  23: (words: number[]) => string;
  27: (words: number[]) => string;
  6: (words: number[]) => number;
  24: (words: number[]) => number;
  3: (words: number[]) => any[];
  5: (words: number[]) => boolean[];
};
declare function getUnknownParser(tagCode: number): (words: number[]) => {
  tagCode: number;
  words: string;
};
declare function wordsToIntBE(words: number[]): number;
declare function routingInfoParser(words: number[]): {
  pubkey: string;
  short_channel_id: string;
  fee_base_msat: number;
  fee_proportional_millionths: number;
  cltv_expiry_delta: number;
}[];

declare function featureBitsParser(words: number[]): { extra_bits: { start_bit: number; bits: boolean[]; has_required: boolean }; [key: string]: any };
declare function hrpToMillisat(hrpString: string, outputString?: boolean): string | bigint;
export {
  DEFAULTNETWORK,
  TESTNETWORK,
  SIGNETNETWORK,
  REGTESTNETWORK,
  SIMNETWORK,
  FEATUREBIT_ORDER,
  DIVISORS,
  MAX_MILLISATS,
  MILLISATS_PER_BTC,
  wordsToIntBE,
  routingInfoParser,
  featureBitsParser,
  hrpToMillisat,
};