# Light BOLT12 Decoder :zap:

[![NPM version](https://img.shields.io/npm/v/light-bolt12-decoder.svg)](https://www.npmjs.com/package/light-bolt12-decoder)

A lightweight and naïve library for decoding and encoding lightning network payment requests as defined in [BOLT #12](https://github.com/lightning/bolts/blob/master/12-offer-encoding.md).

Code derived from [bolt12](https://npmjs.com/package/bolt12), which has the full functionality but it's a pain to run in browsers.

Spits out "sections" of the invoice, in a way that is used to make visualizations like https://bolt12.org/.

The dependencies are minimal: no `Buffer`, only [`@scure/base`](https://github.com/paulmillr/scure-base).

## Installation

You can install this package using `npm` or `yarn`:

```
yarn add light-bolt12-decoder
```

```
npm install light-bolt12-decoder
```