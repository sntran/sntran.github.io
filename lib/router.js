/**
 * A simple router based on URLPattern.
 *
 * Examples:
 *
 * ```js
 * import { router } from "./router.js";
 *
 * const routes = {
 *   "/": (request, env) => new Response("Homepage on all methods"),
 *   "POST@/users": (request, env) => new Response("POST to create user"),
 * }
 *
 * const handler = router(routes);
 *
 * // Cloudflare Workers entrypoint
 * export default {
 *   fetch: handler,
 * }
 *
 * // Deno entrypoint
 * if (import.meta.main) {
 *   const env = Deno.env.toObject();
 *
 *   // Asset serving function similar to CloudFlare.
 *   env.ASSETS = {
 *     fetch(request) {
 *       const { pathname } = new URL(request.url);
 *       const url = new URL(`.${pathname}`, import.meta.url);
 *       return fetch(url);
 *     },
 *   }
  *
 *   Deno.serve((request) => {
 *     return handler(request, env);
 *   });
 * }
 */

/** Polyfill URLPattern, i.e., for Node */
if (!globalThis.URLPattern) {
  await import("urlpattern-polyfill");
}

/**
 * A handler
 *
 * @callback Handler
 * @param {Request} request
 * @param {Object} env Environment variables.
 * @returns {Response|Promise<Response>}
 */

/**
 * Routes request to the appropriate handler.
 * @param {Object} routes
 * @returns {Handler}
 */
export function router(routes = {}) {
  return function(request, env) {
    const url = new URL(request.url);

    for (const [route, handler] of Object.entries(routes)) {
      const [pathname, method] = route.split("@").reverse();

      if (method && request.method !== method) continue;

      const pattern = new URLPattern({ pathname });
      if (!pattern.test(url)) continue;

      const params = pattern.exec(url)?.pathname?.groups || {};
      return handler(request, env, params);
    }

    return env.ASSETS.fetch(request);
  }
}
