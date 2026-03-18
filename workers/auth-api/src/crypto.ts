const encoder = new TextEncoder();

const bytesToHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');

const hexToBytes = (hex: string): Uint8Array => {
  const normalized = hex.trim();
  const bytes = new Uint8Array(normalized.length / 2);

  for (let index = 0; index < normalized.length; index += 2) {
    bytes[index / 2] = Number.parseInt(normalized.slice(index, index + 2), 16);
  }

  return bytes;
};

export const randomHex = (byteLength = 32): string => {
  const buffer = new Uint8Array(byteLength);
  crypto.getRandomValues(buffer);
  return bytesToHex(buffer);
};

export const sha256Hex = async (value: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return bytesToHex(new Uint8Array(digest));
};

export const hashPassword = async (
  password: string,
  saltHex: string,
  iterations = 120_000,
): Promise<string> => {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: hexToBytes(saltHex),
      iterations,
    },
    key,
    256,
  );

  return bytesToHex(new Uint8Array(derivedBits));
};

export const verifyPassword = async (
  password: string,
  saltHex: string,
  expectedHashHex: string,
): Promise<boolean> => {
  const actual = await hashPassword(password, saltHex);
  return actual === expectedHashHex;
};
