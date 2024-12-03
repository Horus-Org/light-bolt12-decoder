
# Light BOLT12 Decoder

A lightweight and naïve library for decoding lightning network payment requests as defined in [BOLT #12](https://github.com/lightning/bolts/blob/master/12-offer-encoding.md).

It doesn't recover payee from signature, doesn't check signature, doesn't parse fallback addresses and doesn't do any encoding -- therefore dependencies are very minimal (no libsecp256k1 here).

Code derived from [bolt11](https://npmjs.com/package/bolt11), which has the full functionality but it's a pain to run in browsers.

Spits out "sections" of the invoice, in a way that is used to make visualizations like https://bolt12.org/.

The dependencies are minimal: no `Buffer`, only [`@scure/base`](https://github.com/paulmillr/scure-base).

## Installation

```
yarn add light-bolt12-decoder
```
