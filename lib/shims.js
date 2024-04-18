if (!globalThis.caches) {
  // Polyfills `caches`.
  globalThis.caches = {
    /**
     * Open a cache storage for the provided name.
     * @param {string} cacheName
     * @returns {Promise<Cache>}
     */
    open(cacheName) {
      let cache = this[cacheName];
      if (!cache) {
        // We don't really handle storage, so we just return a dummy object.
        cache = {
          /**
           * Return cache object matching the provided request.
           * @param {string|Request|URL} input
           * @returns {Promise<Response|undefined>}
           */
          match(_input) {
            // Only return undefined as we don't store cache.
            return Promise.resolve(undefined);
          },
          /**
           * Put the provided request/response into the cache.
           * @param {string|Request|UR} request
           * @param {Response} response
           * @returns {Promise<void>}
           */
          put(_request, _response) {
            // No-op.
            return Promise.resolve();
          },
          /**
           * Delete the cache storage.
           * @returns {Promise<boolean>}
           */
          delete() {
            // No-op.
            return Promise.resolve(true);
          }
        }
        this[cacheName] = cache;
      }
      return Promise.resolve(cache);
    },
    has(cacheName) {
      return Promise.resolve(!!this[cacheName]);
    },
    delete(cacheName) {
      const cache = this[cacheName];
      if (!cache) return Promise.resolve(false);
      delete this[cacheName];
      return Promise.resolve(true);
    },
  };
}
// Default CacheStorage, which provides by default in Cloudflare Workers.
if (!caches.default) {
  caches.default = await caches.open("default");
}

// Polyfills `HTMLRewriter`, which is available on Cloudflare Workers.
if (!globalThis.HTMLRewriter) {
  const { HTMLRewriter: BaseHTMLRewriter } = await import(
    "html-rewriter-wasm"
  );

  class HTMLRewriter {
    #elementHandlers = [];
    #documentHandlers = [];

    constructor() {}

    on(selector, handlers) {
      this.#elementHandlers.push([selector, handlers]);
      return this;
    }

    onDocument(handlers) {
      this.#documentHandlers.push(handlers);
      return this;
    }

    transform({ body }) {
      const elementHandlers = this.#elementHandlers;
      const documentHandlers = this.#documentHandlers;
      let rewriter;

      const { readable, writable } = new TransformStream({
        start(controller) {
          rewriter = new BaseHTMLRewriter((chunk) => {
            if (chunk.length !== 0) {
              controller.enqueue(chunk);
            }
          });

          for (const [selector, handlers] of elementHandlers) {
            rewriter.on(selector, handlers);
          }
          for (const handlers of documentHandlers) {
            rewriter.onDocument(handlers);
          }
        },

        transform: (chunk) => rewriter.write(chunk),
        flush: () => rewriter.end(),
      });

      const promise = body.pipeTo(writable);
      promise.catch(() => {
      }).finally(() => rewriter.free());

      return new Response(readable, {
        headers: { "Content-Type": "text/html" },
      });
    }
  }

  globalThis.HTMLRewriter = HTMLRewriter;
}
