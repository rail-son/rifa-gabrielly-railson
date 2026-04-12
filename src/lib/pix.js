/**
 * PIX BR Code Generator (EMV QR Code spec)
 * Generates a valid PIX copy-paste/QR code string for Brazilian instant payments.
 *
 * PIX Phone key format: +5534991737875
 * Reference: https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf
 */

/**
 * TLV (Tag-Length-Value) encoder
 */
function tlv(id, value) {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

/**
 * CRC16-CCITT/FALSE checksum
 */
function crc16(str) {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
    }
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Sanitize a string for PIX fields (remove accents and invalid chars)
 */
function sanitize(str, maxLen) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim()
    .substring(0, maxLen);
}

/**
 * Generate a PIX BR Code (EMV) string.
 *
 * @param {Object} params
 * @param {string} params.key - PIX key (phone: +5534991737875, CPF, email, or random UUID)
 * @param {string} params.name - Recipient name (max 25 chars)
 * @param {string} params.city - Recipient city (max 15 chars)
 * @param {number|null} params.amount - Transaction amount in BRL (null = no amount fixed)
 * @param {string} [params.txid] - Transaction ID (alphanumeric, max 25 chars)
 * @param {string} [params.description] - Payment description shown to payer (max 72 chars)
 * @returns {string} PIX EMV string ready for QR code generation
 */
export function generatePix({
  key,
  name,
  city,
  amount = null,
  txid = 'RifaGabRailson',
  description = 'Rifa Gabrielly e Railson',
}) {
  // Merchant Account Information (tag 26)
  const merchantAccountParts = [
    tlv('00', 'br.gov.bcb.pix'),
    tlv('01', key),
    ...(description ? [tlv('02', description.substring(0, 72))] : []),
  ];
  const merchantAccount = merchantAccountParts.join('');

  // Additional Data (tag 62) — txid (subtag 05)
  const safeTxid = txid.replace(/[^a-zA-Z0-9]/g, '').substring(0, 25) || '***';
  const additionalData = tlv('05', safeTxid);

  // Amount formatting
  const amountStr = amount !== null ? amount.toFixed(2) : null;

  // Build the payload (without CRC)
  const payloadParts = [
    tlv('00', '01'),                           // Payload Format Indicator
    tlv('26', merchantAccount),               // Merchant Account Info
    tlv('52', '0000'),                        // Merchant Category Code (generic)
    tlv('53', '986'),                         // Transaction Currency (BRL = 986)
    ...(amountStr ? [tlv('54', amountStr)] : []),  // Transaction Amount
    tlv('58', 'BR'),                          // Country Code
    tlv('59', sanitize(name, 25)),           // Merchant Name
    tlv('60', sanitize(city, 15)),           // Merchant City
    tlv('62', additionalData),               // Additional Data
    '6304',                                   // CRC placeholder (will be filled)
  ];

  const payloadWithoutCrc = payloadParts.slice(0, -1).join('');
  const fullPayload = payloadWithoutCrc + '6304';
  const checksum = crc16(fullPayload);

  return payloadWithoutCrc + tlv('63', checksum);
}

/**
 * Convenient generator for the Rifa PIX
 */
export function generateRifaPix(amount, numbers = []) {
  const txid = `Rifa${numbers.slice(0, 3).join('')}`.replace(/[^a-zA-Z0-9]/g, '').substring(0, 25);

  return generatePix({
    key: '+5534991737875',      // Phone PIX key: DDD 34 + 991737875
    name: 'Railson Silva',
    city: 'Uberlandia',
    amount,
    txid: txid || 'RifaGabRailson',
    description: 'Rifa Gabrielly e Railson',
  });
}
