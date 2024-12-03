/* eslint-env jest */

const { decode } = require('../decoder');

describe('decoding invoices', () => {
  it('should decode a BOLT11 invoice', () => {
    const invoice = 'lnbc1...'; // Replace with a valid BOLT11 invoice string.
    const result = decode(invoice);

    expect(result).toEqual({
      paymentRequest: 'lnbc1...', // Match your BOLT11 expected output.
      sections: expect.any(Array),
      expiry: 172800,
      route_hints: expect.any(Array),
    });
  });

  it('should decode a BOLT12 invoice', () => {
    const invoice = 'lno1...'; // Replace with a valid BOLT12 invoice string.
    const result = decode(invoice);

    expect(result).toEqual({
      offer: "Example Offer",
      amount: 1000,
      recurrence: {
        time_unit: "day",
        start: 1680000000,
        limit: 10,
      },
      features: {
        option_payment_metadata: "supported",
        var_onion_optin: "required",
      },
      signature: "f49b4...",
      description: "Payment for services",
      payment_hash: "abc123...",
    });
  });

  it('should throw an error for an unknown invoice type', () => {
    const invoice = 'unknown1...';
    expect(() => decode(invoice)).toThrow('Unknown invoice type');
  });
});
