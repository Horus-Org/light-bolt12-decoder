import { bech32, hex, utf8 } from '@scure/base';

// BOLT12-specific constants
const TAGCODES = {
  offer_id: 1,
  path_offer: 2,
  offer_issuer_id: 3,
  offer_issuer_node_id: 4,
  offer_issuer_signature: 5,
  invoice_request: 7,
  onion_message: 10,
  invreq_metadata: 8,
  payment_hash: 3,
  description: 13,
  issuer: 18,
  quantity_min: 22,
  quantity_max: 23,
  recurrence: 25,
  recurrence_paywindow: 26,
  recurrence_limit: 27,
  recurrence_base: 28,
  fallback_address: 9,
  node_id: 6,
  signature: 16,
  tutstanding: 24,
};

// Reverse TAGCODES for decoding
const TAGNAMES = {};
for (const [key, value] of Object.entries(TAGCODES)) {
  TAGNAMES[value] = key;
}

// Tag parsers for BOLT12
const TAGPARSERS = {
  1: (words) => hex.encode(bech32.fromWordsUnsafe(words)),
  13: (words) => utf8.encode(bech32.fromWordsUnsafe(words)),
  18: (words) => utf8.encode(bech32.fromWordsUnsafe(words)),
  22: wordsToIntBE,
  23: wordsToIntBE,
  25: parseRecurrence,
  26: parsePayWindow,
  27: wordsToIntBE,
  28: parseRecurrenceBase,
  9: (words) => utf8.encode(bech32.fromWordsUnsafe(words)),
  6: (words) => hex.encode(bech32.fromWordsUnsafe(words)),
  16: (words) => hex.encode(bech32.fromWordsUnsafe(words)),
};

// Helper Functions
function wordsToIntBE(words) {
  return words.reverse().reduce((total, item, index) => total + item * Math.pow(32, index), 0);
}

function parseRecurrence(words) {
  const period = wordsToIntBE(words.slice(0, 1));
  const unit = words[1];
  const base = words.length > 2 ? wordsToIntBE(words.slice(2)) : null;
  return { period, unit, base };
}

function parsePayWindow(words) {
  const start = wordsToIntBE(words.slice(0, 4));
  const end = wordsToIntBE(words.slice(4, 8));
  return { start, end };
}

function parseRecurrenceBase(words) {
  const start = wordsToIntBE(words.slice(0, 4));
  const unit = words[4];
  return { start, unit };
}

function decode(offerRequest) {
  if (typeof offerRequest !== 'string') throw new Error('Offer Request must be a string');
  if (offerRequest.slice(0, 2).toLowerCase() !== 'ln') throw new Error('Invalid BOLT12 offer request');

  const sections = [];
  const decoded = bech32.decode(offerRequest, Number.MAX_SAFE_INTEGER);
  const prefix = decoded.prefix;
  let words = decoded.words;

  while (words.length > 0) {
    const tagCode = words[0].toString();
    const tagName = TAGNAMES[tagCode] || 'unknown_tag';
    const parser = TAGPARSERS[tagCode] || ((w) => w);
    
    words = words.slice(1);
    const tagLength = wordsToIntBE(words.slice(0, 2));
    words = words.slice(2);
    const tagWords = words.slice(0, tagLength);
    words = words.slice(tagLength);

    sections.push({
      name: tagName,
      value: parser(tagWords),
    });
  }

  return { offerRequest, sections };
}

export { decode };