/**
 * Volcano Engine signature version 4 (HMAC-SHA256) request signer.
 *
 * Used for Volcano OpenAPI gateways (e.g. cloud-vms.volcengineapi.com).
 * Pure Node crypto, no external dependencies. Credentials are passed in;
 * this module never reads or stores them globally.
 */
import crypto from "node:crypto";

export interface VolcCredentials {
  accessKeyId: string;
  secretAccessKey: string;
}

export interface SignOptions {
  method: string;
  host: string;
  path: string;
  query: Record<string, string>;
  body: string;
  region: string;
  service: string;
  headers?: Record<string, string>;
}

export interface SignedRequest {
  url: string;
  headers: Record<string, string>;
}

const SHA256_EMPTY = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

function sha256Hex(data: string): string {
  return crypto.createHash("sha256").update(data, "utf8").digest("hex");
}

function hmac(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest();
}

function encodeRfc3986(component: string): string {
  return encodeURIComponent(component).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function canonicalQuery(query: Record<string, string>): string {
  return Object.keys(query)
    .sort()
    .map((key) => `${encodeRfc3986(key)}=${encodeRfc3986(query[key] ?? "")}`)
    .join("&");
}

export function signVolcRequest(credentials: VolcCredentials, options: SignOptions): SignedRequest {
  const now = new Date();
  const xDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const shortDate = xDate.slice(0, 8);
  const bodyHash = options.body ? sha256Hex(options.body) : SHA256_EMPTY;

  const baseHeaders: Record<string, string> = {
    host: options.host,
    "content-type": "application/json",
    "x-content-sha256": bodyHash,
    "x-date": xDate,
    ...(options.headers ?? {}),
  };

  const signedHeaderNames = Object.keys(baseHeaders).map((h) => h.toLowerCase()).sort();
  const canonicalHeaders =
    signedHeaderNames.map((h) => `${h}:${baseHeaders[h]?.trim() ?? ""}`).join("\n") + "\n";
  const signedHeaders = signedHeaderNames.join(";");

  const cq = canonicalQuery(options.query);
  const canonicalRequest = [
    options.method.toUpperCase(),
    options.path,
    cq,
    canonicalHeaders,
    signedHeaders,
    bodyHash,
  ].join("\n");

  const credentialScope = `${shortDate}/${options.region}/${options.service}/request`;
  const stringToSign = ["HMAC-SHA256", xDate, credentialScope, sha256Hex(canonicalRequest)].join("\n");

  const kDate = hmac(credentials.secretAccessKey, shortDate);
  const kRegion = hmac(kDate, options.region);
  const kService = hmac(kRegion, options.service);
  const kSigning = hmac(kService, "request");
  const signature = crypto.createHmac("sha256", kSigning).update(stringToSign, "utf8").digest("hex");

  const authorization =
    `HMAC-SHA256 Credential=${credentials.accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const queryString = cq;
  return {
    url: `https://${options.host}${options.path}${queryString ? `?${queryString}` : ""}`,
    headers: { ...baseHeaders, authorization },
  };
}
