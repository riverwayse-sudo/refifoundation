/**
 * Checks the file's binary signature instead of trusting the browser-supplied MIME
 * type. This rejects renamed text/HTML files before they enter the public media bucket.
 */
function ascii(bytes: Uint8Array, start: number, value: string): boolean {
  return [...value].every((char, index) => bytes[start + index] === char.charCodeAt(0));
}

export function hasImageSignature(type: string, bytes: Uint8Array): boolean {
  if (type === "image/png") {
    return bytes.length >= 8 &&
      bytes[0] === 0x89 && ascii(bytes, 1, "PNG") &&
      bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  }
  if (type === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (type === "image/webp") {
    return bytes.length >= 12 && ascii(bytes, 0, "RIFF") && ascii(bytes, 8, "WEBP");
  }
  if (type === "image/avif") {
    return bytes.length >= 12 && ascii(bytes, 4, "ftyp") &&
      (ascii(bytes, 8, "avif") || ascii(bytes, 8, "avis"));
  }
  if (type === "image/gif") {
    return bytes.length >= 6 && (ascii(bytes, 0, "GIF87a") || ascii(bytes, 0, "GIF89a"));
  }
  return false;
}
