import QRCode from 'qrcode';

/**
 * Generate a QR code as a data URL (base64 PNG).
 * @param {object} data - Data to encode in the QR code
 * @returns {Promise<string>} Base64 data URL
 */
export const generateQRCode = async (data) => {
  const payload = JSON.stringify(data);
  return await QRCode.toDataURL(payload);
};

/**
 * Generate a QR token string (base64-encoded JSON).
 * @param {object} data - Data to encode
 * @returns {string} Base64 encoded string
 */
export const generateQRToken = (data) => {
  const payload = JSON.stringify(data);
  return Buffer.from(payload).toString('base64');
};

/**
 * Decode a QR token string (base64-encoded JSON).
 * @param {string} token - Base64 encoded string
 * @returns {object|null} Decoded data or null if invalid
 */
export const decodeQRToken = (token) => {
  try {
    const payload = Buffer.from(token, 'base64').toString('utf8');
    return JSON.parse(payload);
  } catch {
    return null;
  }
};
