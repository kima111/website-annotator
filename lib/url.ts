const PRIVATE_RANGES = [
  /^http:\/\/localhost/i,
  /^https?:\/\/(127|10|172\.(1[6-9]|2\d|3[01])|192\.168)\./i,
  /^https?:\/\/\[::1\]/i
];

export function safeParseUrl(raw: string): URL | null {
  try {
    const u = new URL(raw);
    if (!/^https?:$/.test(u.protocol)) return null;
    for (const r of PRIVATE_RANGES) if (r.test(u.href)) return null;
    return u;
  } catch { return null; }
}

export function absolutize(base: string, maybe: string) {
  try {
    return new URL(maybe, base).toString();
  } catch {
    return maybe;
  }
}