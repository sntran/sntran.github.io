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
  const { HTMLRewriter } = await import("@sntran/html-rewriter");
  globalThis.HTMLRewriter = HTMLRewriter;
}
