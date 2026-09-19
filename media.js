/* =====================================================================
   media.js — resolves every creative slot to a real file.
   Order tried for an image with src "assets/creatives/name.webp":
     1. entry in window.PORTFOLIO_ASSETS (written by tools/prepare-assets.py)
     2. name.webp → name.png → name.jpg → name.jpeg
     3. the untouched original file name (config `original`)
   Nothing is requested when config.assetsAvailable is false.
   ===================================================================== */
(function () {
  'use strict';
  var C = window.PORTFOLIO_CONFIG || {};
  var MAN = window.PORTFOLIO_ASSETS || {};
  var list = C.creatives || [];
  var byId = {};
  list.forEach(function (c, i) { c.n = i + 1; byId[c.id] = c; });

  var EXT = /\.(webp|png|jpe?g|avif|gif|mp4|webm|mov|m4v)$/i;
  function dir(src) { var i = src.lastIndexOf('/'); return i < 0 ? '' : src.slice(0, i + 1); }
  function stem(src) { return src.replace(EXT, '').split('/').pop(); }
  function enc(name) { return name.split('/').map(encodeURIComponent).join('/'); }

  function candidates(c) {
    if (!c || !c.src || C.assetsAvailable === false) return [];
    var base = c.src.replace(EXT, ''), out = [c.src];
    var exts = c.kind === 'video' ? ['.mp4', '.webm', '.mov', '.m4v'] : ['.webp', '.png', '.jpg', '.jpeg'];
    exts.forEach(function (e) { if (out.indexOf(base + e) < 0) out.push(base + e); });
    if (c.original) out.push(dir(c.src) + enc(c.original));
    return out;
  }

  function manifest(c) {
    if (!c || !c.src) return null;
    return MAN[stem(c.src)] || null;
  }

  function probe(url) {
    return new Promise(function (res, rej) {
      var im = new Image();
      im.decoding = 'async';
      im.onload = function () { res(im); };
      im.onerror = rej;
      im.src = url;
    });
  }

  var cache = {};
  /* Resolves to { url, srcset, w, h, img } or rejects when no file exists.
     With a manifest entry the gallery gets the srcset straight away (the
     browser picks the size); `needImg` (3D textures) loads the full file. */
  function image(id, needImg) {
    var key = id + (needImg ? ':img' : '');
    if (cache[key]) return cache[key];
    var c = byId[id];
    var m = manifest(c);
    var p;
    if (C.assetsAvailable === false || !c || !c.src) p = Promise.reject(new Error('no-asset'));
    else if (m && m.src && !needImg) {
      p = Promise.resolve({ url: m.src, srcset: m.srcset || '', w: m.w, h: m.h, img: null });
    } else if (m && m.src) {
      p = probe(m.src).then(function (img) {
        return { url: m.src, srcset: m.srcset || '', w: m.w || img.naturalWidth, h: m.h || img.naturalHeight, img: img };
      });
    } else {
      var urls = candidates(c);
      p = urls.reduce(function (chain, url) {
        return chain.catch(function () {
          return probe(url).then(function (img) {
            return { url: url, srcset: '', w: img.naturalWidth, h: img.naturalHeight, img: img };
          });
        });
      }, Promise.reject(new Error('start')));
    }
    cache[key] = p;
    p.catch(function () {});
    return p;
  }

  /* Attaches sources to a <video> one at a time until one plays. */
  function video(id, el) {
    var c = byId[id];
    var m = manifest(c);
    var urls = m && m.src ? [m.src] : candidates(c);
    if (m && m.poster) el.poster = m.poster;
    else if (c && c.poster) el.poster = c.poster;
    return new Promise(function (res, rej) {
      var i = 0;
      function next() {
        if (i >= urls.length) { cleanup(); rej(new Error('no-video')); return; }
        el.src = urls[i++];
        el.load();
      }
      function ok() { cleanup(); res(el.currentSrc || el.src); }
      function bad() { next(); }
      function cleanup() { el.removeEventListener('loadeddata', ok); el.removeEventListener('error', bad); }
      el.addEventListener('loadeddata', ok);
      el.addEventListener('error', bad);
      next();
    });
  }

  window.PFMedia = { byId: byId, image: image, video: video, candidates: candidates, stem: stem };
})();
