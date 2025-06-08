import { bech32, hex, utf8 } from '@scure/base';

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
const SIGNETNETWORK = {
  bech32: 'tbs',
  pubKeyHash: 0x6f,
  scriptHash: 0xc4,
  validWitnessVersions: [0],
};
declare const REGTESTNETWORK: {
  bech32: 'bcrt';
  pubKeyHash: 0x6f;
  scriptHash: 0xc4;
  validWitnessVersions: [0];
};const SIMNETWORK = {
  bech32: 'sb',
  pubKeyHash: 0x3f,
  scriptHash: 0x7b,
  validWitnessVersions: [0],
};

const FEATUREBIT_ORDER = [
  'option_data_loss_protect',
  'initial_routing_sync',
  'option_upfront_shutdown_script',
  'gossip_queries',
  'var_onion_optin',
  'gossip_queries_ex',
  'option_static_remotekey',
  'payment_secret',
  'basic_mpp',
  'option_support_large_channel',
];

const DIVISORS = {
  m: BigInt(1e3),
  u: BigInt(1e6),
  n: BigInt(1e9),
  p: BigInt(1e12),
};

const MAX_MILLISATS = BigInt('2100000000000000000');
const MILLISATS_PER_BTC = BigInt(1e11);

const TAGCODES = {
  offer_id: 1,
  path_offer: 2,
  offer_issuer_id: 3,
  offer_issuer_node_id: 4,
  offer_issuer_signature: 5,
  onion_message: 10,
  invoice_request: 7,
  invreq_metadata: 8,
  payment_hash: 1, // Note: Duplicate with offer_id, assuming intentional
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

const TAGNAMES = {};
for (const [key, value] of Object.entries(TAGCODES)) {
  TAGNAMES[value] = key;
}

const TAGPARSERS = {
  1: (words) => hex.encode(bech32.fromWordsUnsafe(words)),
  16: (words) => hex.encode(bech32.fromWordsUnsafe(words)),
  13: (words) => utf8.encode(bech32.fromWordsUnsafe(words)),
  19: (words) => hex.encode(bech32.fromWordsUnsafe(words)),
  23: (words) => hex.encode(bech32.fromWordsUnsafe(words)),
  27: (words) => hex.encode(bech32.fromWordsUnsafe(words)),
  6: wordsToIntBE,
  24: wordsToIntBE,
  3: routingInfoParser,
  5: featureBitsParser,
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

function featureBitsParser(words) {
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

  const featureBits = {};
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
}

function hrpToMillisat(hrpString, outputString = false) {
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
  TAGCODES,
  TAGNAMES,
  TAGPARSERS,
  getUnknownParser,
  wordsToIntBE,
  routingInfoParser,
  featureBitsParser,
  hrpToMillisat,
};