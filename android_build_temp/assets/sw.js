/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-5daee600'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "stockfish.wasm.js",
    "revision": "9b2b6c1e065e7cac7dd14c29c0875b0f"
  }, {
    "url": "stockfish.wasm",
    "revision": "a98d8210bfe2a0ce8dde3bbd52439ca5"
  }, {
    "url": "stockfish.js",
    "revision": "d829b0fd5c68e6476d1fb0e6a4ca8175"
  }, {
    "url": "stockfish-19.js",
    "revision": "15f06936cdd44f09197ae4dcf4f1bd64"
  }, {
    "url": "stockfish-19-single.js",
    "revision": "623eb2d0af4d35628d61c749f4630e63"
  }, {
    "url": "stockfish-19-lite.wasm",
    "revision": "76a8273e1d338f51895f7fcb54b44c31"
  }, {
    "url": "stockfish-19-lite.js",
    "revision": "f52c098f6bc5b8aa955566dd2054e510"
  }, {
    "url": "stockfish-19-lite-single.wasm",
    "revision": "c56761eebb1beb83d680f58428ed6286"
  }, {
    "url": "stockfish-19-lite-single.js",
    "revision": "81cc4511ffb3f02a40da47fcb1413cc5"
  }, {
    "url": "stockfish-19-asm.js",
    "revision": "c706040e6878b14cc00d915589fcef40"
  }, {
    "url": "registerSW.js",
    "revision": "402b66900e731ca748771b6fc5e7a068"
  }, {
    "url": "index.html",
    "revision": "dea53e66f480a0e4a50b0ba7bd8c8c13"
  }, {
    "url": "assets/index-igzffRJ_.css",
    "revision": null
  }, {
    "url": "assets/index-Bd_tY2EL.js",
    "revision": null
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(({
    request
  }) => request.destination === "script" || request.destination === "style" || request.destination === "image", new workbox.StaleWhileRevalidate({
    "cacheName": "static-resources",
    plugins: []
  }), 'GET');

}));
