const { bech32, hex, utf8 } = require('@scure/base');

// BOLT12-specific constants
const TAGCODES = {
  offer_id: 1,
  description: 13,
  issuer: 18, // New for BOLT12
  quantity_min: 22, // Min quantity (e.g., for recurring offers)
  quantity_max: 23, // Max quantity
  recurrence: 25, // Recurrence rules
  recurrence_paywindow: 26, // Payment window
  recurrence_limit: 27, // Maximum recurrences
  recurrence_base: 28, // Recurrence base (e.g., absolute start)
  fallback_address: 9,
  node_id: 6,
  signature: 16,
};

// Reverse TAGCODES for decoding
const TAGNAMES = {};
for (const [key, value] of Object.entries(TAGCODES)) {
  TAGNAMES[value] = key;
}

// Tag parsers for BOLT12
const TAGPARSERS = {
  1: (words) => hex.encode(bech32.fromWordsUnsafe(words)), // Offer ID
  13: (words) => utf8.encode(bech32.fromWordsUnsafe(words)), // Description
  18: (words) => utf8.encode(bech32.fromWordsUnsafe(words)), // Issuer
  22: wordsToIntBE, // Quantity min
  23: wordsToIntBE, // Quantity max
  25: parseRecurrence, // Recurrence rules
  26: parsePayWindow, // Payment window
  27: wordsToIntBE, // Recurrence limit
  28: parseRecurrenceBase, // Recurrence base
  9: (words) => utf8.encode(bech32.fromWordsUnsafe(words)), // Fallback address
  6: (words) => hex.encode(bech32.fromWordsUnsafe(words)), // Node ID
  16: (words) => hex.encode(bech32.fromWordsUnsafe(words)), // Signature
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

  // Parse tags
  while (words.length > 0) {
    const tagCode = words[0].toString();
    const tagName = TAGNAMES[tagCode] || 'unknown_tag';
    const parser = TAGPARSERS[tagCode] || ((w) => w);
    
    words = words.slice(1); // Remove tag code

    const tagLength = wordsToIntBE(words.slice(0, 2));
    words = words.slice(2); // Remove tag length

    const tagWords = words.slice(0, tagLength);
    words = words.slice(tagLength); // Remove parsed words

    sections.push({
      name: tagName,
      value: parser(tagWords),
    });
  }

  return { offerRequest, sections };
}

module.exports = {
  decode,
};
