import type { MockInspectionTemplate } from "@/types/inspection";

/** Serializa con claves ordenadas recursivamente → JSON estable para hashing. */
export function canonicalJSON(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalJSON).join(",") + "]";
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonicalJSON(obj[k])).join(",") + "}";
}

/** SHA-256 hex. Usa Web Crypto si está disponible; si no, una impl JS pura. */
export async function sha256Hex(text: string): Promise<string> {
  const subtle = (globalThis.crypto as Crypto | undefined)?.subtle;
  if (subtle) {
    const buf = await subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  return sha256Fallback(text);
}

/** Hash de la DEFINICIÓN de la plantilla (excluye _source/revision y cualquier meta). */
export async function computeTemplateHash(template: MockInspectionTemplate): Promise<string> {
  const definition = {
    id: template.id,
    code: template.code,
    name: template.name,
    discipline: template.discipline,
    sections: template.sections,
  };
  return sha256Hex(canonicalJSON(definition));
}

// Impl JS pura de SHA-256 (fallback sin Web Crypto). Determinista.
function sha256Fallback(ascii: string): string {
  /* eslint-disable */
  function rightRotate(value: number, amount: number) { return (value >>> amount) | (value << (32 - amount)); }
  const mathPow = Math.pow; const maxWord = mathPow(2, 32); let result = "";
  const words: number[] = []; const asciiBitLength = ascii.length * 8;
  let hash: number[] = (sha256Fallback as any).h = (sha256Fallback as any).h || [];
  const k: number[] = (sha256Fallback as any).k = (sha256Fallback as any).k || [];
  let primeCounter = k.length; const isComposite: Record<number, number> = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (let i = 0; i < 313; i += candidate) isComposite[i] = candidate;
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }
  hash = hash.slice(0, 8);
  let bytes: number[] = []; for (let i = 0; i < ascii.length; i++) bytes.push(ascii.charCodeAt(i) & 0xff);
  bytes.push(0x80); while ((bytes.length % 64) - 56) bytes.push(0);
  for (let i = 0; i < bytes.length; i++) { words[i >> 2] |= bytes[i] << ((3 - i) % 4) * 8; }
  words[(((bytes.length + 8) >> 6) << 4) + 15] = asciiBitLength;
  for (let j = 0; j < words.length;) {
    const w = words.slice(j, (j += 16)); const oldHash = hash.slice(0);
    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2];
      const s0 = w15 !== undefined ? (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) : 0;
      const s1 = w2 !== undefined ? (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10)) : 0;
      if (i >= 16) w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      const a = hash[0], e = hash[4];
      const temp1 = (hash[7] + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
        + ((e & hash[5]) ^ (~e & hash[6])) + k[i] + (w[i] | 0)) | 0;
      const temp2 = ((rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
        + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]))) | 0;
      hash = [(temp1 + temp2) | 0].concat(hash); hash[4] = (hash[4] + temp1) | 0;
    }
    for (let i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
  }
  for (let i = 0; i < 8; i++) for (let j = 3; j + 1; j--) {
    const b = (hash[i] >> (j * 8)) & 0xff; result += (b < 16 ? "0" : "") + b.toString(16);
  }
  return result;
  /* eslint-enable */
}
