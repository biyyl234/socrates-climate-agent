/**
 * file:// fetch shim for the packaged Android WebView.
 *
 * Android WebView's `fetch()` rejects the `file:` scheme, while XMLHttpRequest
 * still loads local assets fine (verified: local texture returns HTTP 200 /
 * status 0 with full bytes). PixiJS v8 requests textures/model JSON through
 * fetch, so without this shim every local asset fails and the model never
 * reports ready.
 *
 * The shim only installs itself when the current page was opened over
 * `file:`. http(s) and every other scheme pass straight through to the native
 * fetch, so the web/online build behaves exactly as before.
 */

interface ShimHeaders {
  get(name: string): string | null;
}

function parseResponseHeaders(raw: string): ShimHeaders {
  const map = new Map<string, string>();
  for (const line of raw.split(/\r?\n/)) {
    const colon = line.indexOf(":");
    if (colon <= 0) continue;
    map.set(line.slice(0, colon).trim().toLowerCase(), line.slice(colon + 1).trim());
  }
  return {
    get: (name) => map.get(name.toLowerCase()) ?? null,
  };
}

/** Response-like view over a single ArrayBuffer loaded via XHR. */
class ShimResponse {
  readonly ok: boolean;
  readonly status: number;
  readonly url: string;
  readonly headers: ShimHeaders;
  private readonly body: ArrayBuffer;

  constructor(xhr: XMLHttpRequest, url: string) {
    this.status = xhr.status;
    // Local files over file:// commonly report status 0; treat 0 and any 2xx
    // as success, matching XHR behaviour used to verify the load.
    this.ok = this.status === 0 || (this.status >= 200 && this.status < 300);
    this.url = url;
    this.headers = parseResponseHeaders(xhr.getAllResponseHeaders());
    this.body = xhr.response as ArrayBuffer;
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    return this.body;
  }

  async blob(): Promise<Blob> {
    return new Blob([this.body]);
  }

  async text(): Promise<string> {
    return new TextDecoder().decode(this.body);
  }

  async json(): Promise<unknown> {
    return JSON.parse(await this.text());
  }
}

function resolvesToFile(url: string, location: Location): boolean {
  if (/^file:/i.test(url)) return true;
  try {
    return new URL(url, location.href).protocol === "file:";
  } catch {
    return false;
  }
}

function xhrFetch(url: string, init?: RequestInit): Promise<ShimResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(init?.method ?? "GET", url, true);
    // Read bytes once; arrayBuffer/blob/text/json are all derived from this
    // same ArrayBuffer, covering every fetch consumer used by the bundle.
    xhr.responseType = "arraybuffer";

    const headers = init?.headers;
    if (headers) {
      if (headers instanceof Headers) {
        headers.forEach((value, name) => xhr.setRequestHeader(name, value));
      } else {
        for (const [name, value] of Object.entries(headers as Record<string, string>)) {
          xhr.setRequestHeader(name, value);
        }
      }
    }

    const body = (init?.body as XMLHttpRequestBodyInit | null) ?? null;
    xhr.onload = () => {
      const status = xhr.status;
      if (status === 0 || (status >= 200 && status < 300)) {
        resolve(new ShimResponse(xhr, url));
      } else {
        reject(new Error(`file fetch failed: HTTP ${status}`));
      }
    };
    xhr.onerror = () => reject(new Error("file fetch failed: network error"));
    xhr.onabort = () => reject(new Error("file fetch aborted"));
    xhr.send(body);
  });
}

function installFileFetchShim(): void {
  if (typeof window === "undefined" || typeof location === "undefined") return;
  if (location.protocol !== "file:") return;

  const nativeFetch = window.fetch.bind(window);
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    if (resolvesToFile(url, location)) {
      return xhrFetch(url, init);
    }
    return nativeFetch(input, init);
  }) as typeof window.fetch;
}

installFileFetchShim();
