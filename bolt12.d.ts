const { bech32, hex, utf8 } = require('@scure/base');

// defaults for encode; default timestamp is current time at call
const DEFAULTNETWORK = {
  // default network is bitcoin
  bech32: 'bc',
  pubKeyHash: 0x00,
  scriptHash: 0x05,
  validWitnessVersions: [0],
};
const TESTNETWORK = {
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
const REGTESTNETWORK = {
  bech32: 'bcrt',
  pubKeyHash: 0x6f,
  scriptHash: 0xc4,
  validWitnessVersions: [0],
};
const SIMNETWORK = {
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
  invoice_request: 7,
  invreq_metadata: 8,
  payment_hash: 3,
  payment_hash: 1,
  payment_secret: 16,
  description: 13,
  payee: 19,
  description_hash: 23, // commit to longer descriptions (used by lnurl-pay)
  expiry: 6, // default: 3600 (1 hour)
  min_final_cltv_expiry: 24, // default: 9
  fallback_address: 9,
  route_hint: 3, // for extra routing info (private etc.)
  feature_bits: 5,
  metadata: 27,
};

// reverse the keys and values of TAGCODES and insert into TAGNAMES
const TAGNAMES = {};
for (let i = 0, keys = Object.keys(TAGCODES); i < keys.length; i++) {
  const currentName = keys[i];
  const currentCode = TAGCODES[keys[i]].toString();
  TAGNAMES[currentCode] = currentName;
}

const TAGPARSERS = {
  1: (words) => hex.encode(bech32.fromWordsUnsafe(words)), // 256 bits
  16: (words) => hex.encode(bech32.fromWordsUnsafe(words)), // 256 bits
  13: (words) => utf8.encode(bech32.fromWordsUnsafe(words)), // string variable length
  19: (words) => hex.encode(bech32.fromWordsUnsafe(words)), // 264 bits
  23: (words) => hex.encode(bech32.fromWordsUnsafe(words)), // 256 bits
  27: (words) => hex.encode(bech32.fromWordsUnsafe(words)), // variable
  6: wordsToIntBE, // default: 3600 (1 hour)
  24: wordsToIntBE, // default: 9
  3: routingInfoParser, // for extra routing info (private etc.)
  5: featureBitsParser, // keep feature bits as array of 5 bit words
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

// first convert from words to buffer, trimming padding where necessary
// parse in 51 byte chunks. See encoder for details.
function routingInfoParser(words) {
  const routes = [];
  let pubkey,
    shortChannelId,
    feeBaseMSats,
    feeProportionalMillionths,
    cltvExpiryDelta;
  let routesBuffer = bech32.fromWordsUnsafe(words);
  while (routesBuffer.length > 0) {
    pubkey = hex.encode(routesBuffer.slice(0, 33)); // 33 bytes
    shortChannelId = hex.encode(routesBuffer.slice(33, 41)); // 8 bytes
    feeBaseMSats = parseInt(hex.encode(routesBuffer.slice(41, 45)), 16); // 4 bytes
    feeProportionalMillionths = parseInt(
      hex.encode(routesBuffer.slice(45, 49)),
      16
    ); // 4 bytes
    cltvExpiryDelta = parseInt(hex.encode(routesBuffer.slice(49, 51)), 16); // 2 bytes

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

  const featureBits: {
    [key: string]: string | {
      start_bit: number;
      bits: boolean[];
      has_required: boolean;
    };
  } = {};

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
      (result, bit, index) =>
        index % 2 !== 0 ? result || false : result || bit,
      false
    ),
  };

  return featureBits;
}
function hrpToMillisat(hrpString, outputString) {
  let divisor, value;
  if (hrpString.slice(-1).match(/^[munp]$/)) {
    divisor = hrpString.slice(-1);
    value = hrpString.slice(0, -1);
  } else if (hrpString.slice(-1).match(/^[^munp0-9]$/)) {
    throw new Error('Not a valid multiplier for the amount');
  } else {
    value = hrpString;
  }

  if (!value.match(/^\d+$/))
    throw new Error('Not a valid human readable amount');

  const valueBN = BigInt(value);

  const millisatoshisBN = divisor
    ? (valueBN * MILLISATS_PER_BTC) / DIVISORS[divisor]
    : valueBN * MILLISATS_PER_BTC;

  if (
    (divisor === 'p' && !(valueBN % BigInt(10) === BigInt(0))) ||
    millisatoshisBN > MAX_MILLISATS
  ) {
    throw new Error('Amount is outside of valid range');
  }

  return outputString ? millisatoshisBN.toString
