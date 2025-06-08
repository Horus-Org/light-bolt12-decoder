// Importações corrigidas
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
declare const MILLISATS_PER_BTC: bigint = 100000000000n;

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
declare const TAGNAMES: Record<number, string>;for (const [key, value] of Object.entries(TAGCODES)) {
  TAGNAMES[value] = key;
}

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
function getUnknownParser(tagCode) {
  return (words) => ({
    tagCode: parseInt(tagCode),
    words: bech32.encode('unknown', words, Number.MAX_SAFE_INTEGER),
  });
}

function wordsToIntBE(words) {
  return words.reverse().reduce((total, item, index) => {
    return total + item * Math.pow(32, index);
  }, 0);
}

function routingInfoParser(words) {
  const routes = [];
  let routesBuffer = bech32.fromWordsUnsafe(words);
  while (routesBuffer.length > 0) {
    const pubkey = hex.encode(routesBuffer.slice(0, 33));
    const shortChannelId = hex.encode(routesBuffer.slice(33, 41));
    const feeBaseMSats = parseInt(hex.encode(routesBuffer.slice(41, 45)), 16);
    const feeProportionalMillionths = parseInt(hex.encode(routesBuffer.slice(45, 49)), 16);
    const cltvExpiryDelta = parseInt(hex.encode(routesBuffer.slice(49, 51)), 16);

    routesBuffer = routesBuffer.slice(51);

    routes.push({
      pubkey,
      short_channel_id: shortChannelId,
      fee_base_msat: feeBaseMSats,
      fee_proportional_millionths: feeProportionalMillionths,
      cltv_expiry_delta: cltvExpiryDelta,
    });
  }
  return routes;
}

function featureBitsParser(words): { extra_bits: { start_bit: number; bits: boolean[]; has_required: boolean }; [key: string]: any } {
  const bools = words
    .slice()
    .reverse()
    .map((word) => [
      !!(word & 0b1),
      !!(word & 0b10),
      !!(word & 0b100),
      !!(word & 0b1000),
      !!(word & 0b10000),
    ])
    .reduce((finalArr, itemArr) => finalArr.concat(itemArr), []);
  while (bools.length < FEATUREBIT_ORDER.length * 2) {
    bools.push(false);
  }

  const featureBits = {
    extra_bits: {
      start_bit: 0,
      bits: [],
      has_required: false
    }
  } as { extra_bits: { start_bit: number; bits: boolean[]; has_required: boolean }; [key: string]: any };

  FEATUREBIT_ORDER.forEach((featureName, index) => {
    let status;
    if (bools[index * 2]) {
      status = 'required';
    } else if (bools[index * 2 + 1]) {
      status = 'supported';
    } else {
      status = 'unsupported';
    }
    featureBits[featureName] = status;
  });

  const extraBits = bools.slice(FEATUREBIT_ORDER.length * 2);
  featureBits.extra_bits = {
    start_bit: FEATUREBIT_ORDER.length * 2,
    bits: extraBits,
    has_required: extraBits.reduce(
      (result, bit, index) => (index % 2 !== 0 ? result || false : result || bit),
      false
    ),
  };

  return featureBits;
}function hrpToMillisat(hrpString, outputString = false) {
  let divisor, value;
  if (hrpString.slice(-1).match(/^[munp]$/)) {
    divisor = hrpString.slice(-1);
    value = hrpString.slice(0, -1);
  } else if (hrpString.slice(-1).match(/^[^munp0-9]$/)) {
    throw new Error('Not a valid multiplier for the amount');
  } else {
    value = hrpString;
  }

  if (!value.match(/^\d+$/)) throw new Error('Not a valid human readable amount');

  const valueBN = BigInt(value);
  const millisatoshisBN = divisor
    ? (valueBN * MILLISATS_PER_BTC) / DIVISORS[divisor]
    : valueBN * MILLISATS_PER_BTC;

  if (
    (divisor === 'p' && !(valueBN % BigInt(10) === BigInt(0))) ||
    millisatoshisBN > MAX_MILLISATS ||
    millisatoshisBN < 0
  ) {
    throw new Error('Amount is outside of valid range');
  }

  return outputString ? millisatoshisBN.toString() : millisatoshisBN;
}

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