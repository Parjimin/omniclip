import path from "node:path";

/* ------------------------------------------------------------------ */
/*  Rate Limiter — in-memory sliding window per key                   */
/* ------------------------------------------------------------------ */

interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const RATE_LIMIT_CLEANUP_INTERVAL_MS = 60_000;

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    entry.timestamps = entry.timestamps.filter(
      (timestamp) => now - timestamp < 600_000,
    );
    if (entry.timestamps.length === 0) {
      rateLimitStore.delete(key);
    }
  }
}, RATE_LIMIT_CLEANUP_INTERVAL_MS);

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key) ?? { timestamps: [] };

  entry.timestamps = entry.timestamps.filter(
    (timestamp) => now - timestamp < windowMs,
  );

  if (entry.timestamps.length >= maxRequests) {
    const oldest = entry.timestamps[0] ?? now;
    const retryAfterMs = Math.max(0, windowMs - (now - oldest));
    return { allowed: false, remaining: 0, retryAfterMs };
  }

  entry.timestamps.push(now);
  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    remaining: maxRequests - entry.timestamps.length,
    retryAfterMs: 0,
  };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

/* ------------------------------------------------------------------ */
/*  CSRF — Origin / Referer check                                     */
/* ------------------------------------------------------------------ */

export function isValidOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host");

  if (!host) {
    return true;
  }

  if (origin) {
    try {
      const originHost = new URL(origin).host;
      return originHost === host;
    } catch {
      return false;
    }
  }

  if (referer) {
    try {
      const refererHost = new URL(referer).host;
      return refererHost === host;
    } catch {
      return false;
    }
  }

  // No origin or referer: likely same-origin API call (e.g. fetch from
  // same page without CORS), or non-browser client. Allow for now.
  return true;
}

/* ------------------------------------------------------------------ */
/*  SSRF — URL validation (block private IPs / localhost)             */
/* ------------------------------------------------------------------ */

const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^::1$/,
  /^fc00:/i,
  /^fd/i,
  /^fe80:/i,
];

export function validateExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    if (
      hostname === "localhost" ||
      hostname === "0.0.0.0" ||
      hostname === "[::1]"
    ) {
      return false;
    }

    if (PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(hostname))) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Path traversal — validate file path stays within root             */
/* ------------------------------------------------------------------ */

export function isPathWithin(filePath: string, rootDir: string): boolean {
  const resolved = path.resolve(filePath);
  const resolvedRoot = path.resolve(rootDir);
  return (
    resolved === resolvedRoot || resolved.startsWith(resolvedRoot + path.sep)
  );
}

/* ------------------------------------------------------------------ */
/*  Filename sanitizer — safe Content-Disposition                     */
/* ------------------------------------------------------------------ */

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
}
