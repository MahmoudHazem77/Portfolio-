/* =====================================================================
   stage.js — the 3D sleeve layer.
   One fixed <canvas> behind the page. Each "act" is tied to a section
   and poses its sleeves from that section's scroll position (v = how
   many viewport heights the section top has scrolled past).
   Sleeves are procedural (padded face, rim, zipper). Set
   PORTFOLIO_CONFIG.model.url to a .glb and every sleeve swaps to it —
   the acts only move the wrapper group, so choreography is unchanged.
   ===================================================================== */
(function () {
  'use strict';

  var html = document.documentElement;
  var C = window.PORTFOLIO_CONFIG || {};
  var noop = function () {};
  var Stage = window.Stage = {
    ok: false, ready: Promise.resolve(),
    init: init, measure: noop, intro: noop, setBackdrop: noop
  };

  /* ---------- math ---------- */
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var seg = function (v, a, b) { return clamp((v - a) / (b - a), 0, 1); };
  var mix = function (a, b, t) { return a + (b - a) * t; };
  var E = {
    io: function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    o: function (t) { return 1 - Math.pow(1 - t, 3); },
    sine: function (t) { return -(Math.cos(Math.PI * t) - 1) / 2; }
  };
  var RAD = Math.PI / 180;

  /* ---------- sleeve dimensions (world units) ---------- */
  var W = 2.72, H = 2.0, R = 0.19, T = 0.055, PUFF = 0.075;
  var FOV = 32, CAMZ = 12, TAN = Math.tan(FOV / 2 * RAD);

  function init() {
    var THREE = window.THREE;
    var canvas = document.querySelector('canvas.stage');
    if (!THREE || !canvas || html.classList.contains('rm')) { html.classList.add('no-webgl'); return false; }

    var coarse = matchMedia('(pointer: coarse)').matches;
    var lowPower = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
    var dprCap = lowPower ? 1.25 : coarse ? 1.5 : 1.75;
    var blurOn = !coarse;

    var probe = document.createElement('canvas');
    if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) { html.classList.add('no-webgl'); return false; }
    var renderer;
    try {
      if (THREE.ColorManagement) THREE.ColorManagement.legacyMode = false;
      renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    } catch (e) {
      html.classList.add('no-webgl');
      return false;
    }
    html.classList.add('webgl');
    Stage.ok = true;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.setClearColor(0x000000, 0);
    renderer.autoClear = false;

    var scene = new THREE.Scene();
    scene.fog = new THREE.Fog(new THREE.Color('#F3F0EA'), CAMZ + 1, CAMZ + 40);
    var camera = new THREE.PerspectiveCamera(FOV, innerWidth / innerHeight, 0.1, 120);
    camera.position.z = CAMZ;

    var hemi = new THREE.HemisphereLight(0xffffff, 0x2e2c2a, 0.55);
    var key = new THREE.DirectionalLight(0xffffff, 1.0); key.position.set(-4, 5, 7);
    var rim = new THREE.DirectionalLight(0xffffff, 0.8); rim.position.set(5, 3, -6);
    var fill = new THREE.DirectionalLight(0xfff1e0, 0.28); fill.position.set(6, -3, 5);
    [hemi, key, rim, fill].forEach(function (l) { l.layers.enableAll(); scene.add(l); });

    /* ---------- blur layer: rear sleeves render at quarter res, blurred ---------- */
    var rt = new THREE.WebGLRenderTarget(4, 4);
    var bMat = new THREE.ShaderMaterial({
      uniforms: { tMap: { value: rt.texture }, uTexel: { value: new THREE.Vector2(1, 1) } },
      vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader: [
        'uniform sampler2D tMap;uniform vec2 uTexel;varying vec2 vUv;',
        'vec3 toS(vec3 c){return mix(c*12.92,1.055*pow(max(c,vec3(0.)),vec3(1./2.4))-.055,step(vec3(.0031308),c));}',
        'void main(){vec4 s=vec4(0.);float ws=0.;',
        'for(int x=-2;x<=2;x++){for(int y=-2;y<=2;y++){float w=exp(-float(x*x+y*y)/4.5);',
        's+=texture2D(tMap,vUv+vec2(float(x),float(y))*uTexel*1.3)*w;ws+=w;}}',
        's/=ws;vec3 c=s.a>.001?s.rgb/s.a:vec3(0.);gl_FragColor=vec4(toS(c)*s.a,s.a);}'
      ].join(''),
      transparent: true, depthTest: false, depthWrite: false,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor
    });
    var bScene = new THREE.Scene();
    var bQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bMat);
    bQuad.frustumCulled = false;
    bScene.add(bQuad);
    var bCam = new THREE.Camera();

    /* ---------- procedural sleeve geometry ---------- */
    function sdf(x, y) {
      var qx = Math.abs(x) - (W / 2 - R), qy = Math.abs(y) - (H / 2 - R);
      var ox = Math.max(qx, 0), oy = Math.max(qy, 0);
      return Math.sqrt(ox * ox + oy * oy) + Math.min(Math.max(qx, qy), 0) - R;
    }
    function clampRR(x, y) {
      var cx = W / 2 - R, cy = H / 2 - R, ax = Math.abs(x), ay = Math.abs(y);
      if (ax > cx && ay > cy) {
        var dx = ax - cx, dy = ay - cy, l = Math.sqrt(dx * dx + dy * dy);
        if (l > R) { ax = cx + dx / l * R; ay = cy + dy / l * R; }
      }
      return [x < 0 ? -ax : ax, y < 0 ? -ay : ay];
    }
    function faceGeometry(back) {
      var sx = 64, sy = 48, pos = [], uv = [], idx = [];
      for (var j = 0; j <= sy; j++) {
        for (var i = 0; i <= sx; i++) {
          var p = clampRR((i / sx - 0.5) * W, (j / sy - 0.5) * H);
          var d = clamp(-sdf(p[0], p[1]) / 0.46, 0, 1);
          var z = T + PUFF * (1 - (1 - d) * (1 - d));
          var u = p[0] / W + 0.5, v = p[1] / H + 0.5;
          if (back) { z = -z; u = 1 - u; }
          pos.push(p[0], p[1], z); uv.push(u, v);
        }
      }
      for (j = 0; j < sy; j++) {
        for (i = 0; i < sx; i++) {
          var a = j * (sx + 1) + i, b = a + 1, c = a + sx + 1, e = c + 1;
          if (back) idx.push(a, e, b, a, c, e); else idx.push(a, b, e, a, e, c);
        }
      }
      var g = new THREE.BufferGeometry();
      g.setIndex(idx);
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.computeVertexNormals();
      return g;
    }
    function perimeter() {
      var pts = [], cx = W / 2 - R, cy = H / 2 - R;
      var cs = [[cx, cy, 0], [-cx, cy, 90], [-cx, -cy, 180], [cx, -cy, 270]];
      cs.forEach(function (c, k) {
        for (var s = 0; s <= 12; s++) {
          var a = (c[2] + s * 7.5) * RAD;
          pts.push([c[0] + Math.cos(a) * R, c[1] + Math.sin(a) * R, Math.cos(a), Math.sin(a)]);
        }
        var n = cs[(k + 1) % 4], a2 = (c[2] + 90) * RAD, nx = Math.cos(a2), ny = Math.sin(a2);
        var x0 = c[0] + nx * R, y0 = c[1] + ny * R, x1 = n[0] + nx * R, y1 = n[1] + ny * R;
        var steps = k % 2 === 0 ? 18 : 12;
        for (var t = 1; t < steps; t++) pts.push([mix(x0, x1, t / steps), mix(y0, y1, t / steps), nx, ny]);
      });
      return pts;
    }
    function rimGeometry() {
      var P = perimeter(), M = 14, a0 = -0.28, a1 = Math.PI + 0.28, pos = [], nor = [], idx = [];
      P.forEach(function (p) {
        for (var j = 0; j <= M; j++) {
          var a = mix(a0, a1, j / M), s = Math.sin(a), c = Math.cos(a);
          pos.push(p[0] + p[2] * T * s, p[1] + p[3] * T * s, T * c);
          nor.push(p[2] * s, p[3] * s, c);
        }
      });
      var N = P.length, r = M + 1;
      for (var i = 0; i < N; i++) {
        var i2 = (i + 1) % N;
        for (var j = 0; j < M; j++) {
          var a = i * r + j, b = i2 * r + j, c = i2 * r + j + 1, d = i * r + j + 1;
          idx.push(a, c, b, a, d, c);
        }
      }
      var g = new THREE.BufferGeometry();
      g.setIndex(idx);
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      return g;
    }
    function zipGeometry() {
      var cx = W / 2 - R, cy = H / 2 - R, o = R + T * 1.02, v = [], s;
      for (s = 0; s <= 6; s++) v.push(new THREE.Vector3(cx + o, mix(-cy * 0.35, cy, s / 6), 0));
      for (s = 1; s <= 10; s++) { var a = s * 9 * RAD; v.push(new THREE.Vector3(cx + Math.cos(a) * o, cy + Math.sin(a) * o, 0)); }
      for (s = 1; s < 10; s++) v.push(new THREE.Vector3(mix(cx, -cx, s / 10), cy + o, 0));
      for (s = 0; s <= 10; s++) { var b = (90 + s * 9) * RAD; v.push(new THREE.Vector3(-cx + Math.cos(b) * o, cy + Math.sin(b) * o, 0)); }
      for (s = 1; s <= 6; s++) v.push(new THREE.Vector3(-cx - o, mix(cy, -cy * 0.35, s / 6), 0));
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(v), 260, 0.012, 6, false);
    }
    var GEO = {
      front: faceGeometry(false), back: faceGeometry(true), rim: rimGeometry(), zip: zipGeometry(),
      pull: new THREE.BoxGeometry(0.05, 0.24, 0.028)
    };

    /* ---------- print textures ---------- */
    var TW = coarse ? 768 : 1024, TH = Math.round(TW / 1.36);
    var maxAniso = renderer.capabilities.getMaxAnisotropy();
    var prints = {};
    var weaveCanvas = (function () {
      var c = document.createElement('canvas'); c.width = c.height = 64;
      var g = c.getContext('2d'), img = g.createImageData(64, 64), d = img.data;
      for (var y = 0; y < 64; y++) {
        for (var x = 0; x < 64; x++) {
          var cell = ((x >> 2) + (y >> 2)) & 1;
          var line = cell ? (y & 1) : (x & 1);
          var v = 128 + (line ? 34 : -34) + (Math.random() * 40 - 20);
          var k = (y * 64 + x) * 4; d[k] = d[k + 1] = d[k + 2] = v; d[k + 3] = 255;
        }
      }
      g.putImageData(img, 0, 0);
      return c;
    })();
    function paint(canvasEl, color, img, crop) {
      var g = canvasEl.getContext('2d'), w = canvasEl.width, h = canvasEl.height;
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      g.fillStyle = color; g.fillRect(0, 0, w, h);
      if (img) {
        var iw = img.naturalWidth, ih = img.naturalHeight, cr = crop || [0, 0, 1, 1];
        g.drawImage(img, cr[0] * iw, cr[1] * ih, (cr[2] - cr[0]) * iw, (cr[3] - cr[1]) * ih, 0, 0, w, h);
      }
      g.save();
      g.globalCompositeOperation = 'soft-light'; g.globalAlpha = img ? 0.05 : 0.16;
      g.fillStyle = g.createPattern(weaveCanvas, 'repeat'); g.fillRect(0, 0, w, h);
      g.restore();
      var rg = g.createRadialGradient(w * 0.3, h * 0.22, 0, w * 0.3, h * 0.22, w * 0.95);
      rg.addColorStop(0, 'rgba(255,255,255,.05)'); rg.addColorStop(1, 'rgba(0,0,0,.07)');
      g.fillStyle = rg; g.fillRect(0, 0, w, h);
    }
    function print(keyName) {
      if (prints[keyName]) return prints[keyName];
      var sc = (C.sleeves || {})[keyName] || { color: '#1a1a1a' };
      var cv = document.createElement('canvas'); cv.width = TW; cv.height = TH;
      paint(cv, sc.color);
      var tex = new THREE.CanvasTexture(cv);
      tex.encoding = THREE.sRGBEncoding; tex.anisotropy = Math.min(4, maxAniso);
      var gl = tex.clone(); gl.flipY = false; gl.needsUpdate = true;   // glTF UV convention
      prints[keyName] = { canvas: cv, tex: tex, gltf: gl, sc: sc, state: 'base' };
      return prints[keyName];
    }
    function loadImg(src) {
      return new Promise(function (res, rej) {
        var im = new Image(); im.decoding = 'async';
        im.onload = function () { res({ img: im }); }; im.onerror = rej; im.src = src;
      });
    }
    function ensurePrint(keyName) {
      var p = print(keyName);
      if (p.state !== 'base' || C.assetsAvailable === false) return p.done || Promise.resolve();
      var direct = p.sc.print, viaCreative = p.sc.from && window.PFMedia;
      if (!direct && !viaCreative) return Promise.resolve();
      p.state = 'loading';
      var src = direct ? ((window.PORTFOLIO_PRINTS || {})[keyName] || direct) : null;
      var fromCreative = function () {
        if (!viaCreative) return Promise.reject(new Error('no-print'));
        return window.PFMedia.image(p.sc.from, true).then(function (r) { return { img: r.img, crop: p.sc.crop }; });
      };
      var job = direct ? loadImg(src).then(function (r) { return { img: r.img, crop: null }; }, fromCreative) : fromCreative();
      p.done = job.then(function (r) {
        paint(p.canvas, p.sc.color, r.img, r.crop);
        try { p.canvas.getContext('2d').getImageData(0, 0, 1, 1); }
        catch (e) { paint(p.canvas, p.sc.color); p.state = 'tainted'; return; }   // file:// or cross-origin
        p.tex.needsUpdate = true; p.gltf.needsUpdate = true; p.state = 'ready';
        dirty = true;
      }, function () { p.state = 'missing'; });
      return p.done;
    }

    /* ---------- optional GLB ---------- */
    var template = null;
    function loadScript(src) {
      return new Promise(function (res, rej) {
        var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
    }
    function loadModel() {
      var m = C.model || {};
      if (!m.url) return Promise.resolve();
      return loadScript('vendor/GLTFLoader.js')
        .then(function () { return m.draco ? loadScript('vendor/DRACOLoader.js') : null; })
        .then(function () {
          return new Promise(function (res) {
            var L = new THREE.GLTFLoader();
            if (m.draco && THREE.DRACOLoader) {
              var dl = new THREE.DRACOLoader(); dl.setDecoderPath('vendor/draco/'); L.setDRACOLoader(dl);
            }
            L.load(m.url, function (gltf) {
              var root = gltf.scene, box = new THREE.Box3().setFromObject(root);
              var size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
              var s = (W / Math.max(size.x, 1e-6)) * (m.scale || 1);
              root.position.sub(ctr);
              var wrap = new THREE.Group(); wrap.add(root); wrap.scale.setScalar(s);
              template = wrap;
              sleeves.forEach(function (sl) { sl.useModel(); });
              dirty = true;
              res();
            }, undefined, function (err) {
              console.warn('[stage] model failed to load, keeping the procedural sleeve.', err);
              res();
            });
          });
        })
        .catch(function (e) { console.warn('[stage] model loader unavailable', e); });
    }

    /* ---------- sleeve ---------- */
    var sleeves = [];
    var FIELDS = ['x', 'y', 'z', 'rx', 'ry', 'rz', 'w', 'o'];
    function Sleeve(keyName) {
      this.key = keyName;
      this.group = new THREE.Group();
      this.group.visible = false;
      this.face = new THREE.MeshStandardMaterial({ map: print(keyName).tex, roughness: 0.86, metalness: 0 });
      this.rim = new THREE.MeshStandardMaterial({ color: 0x0f0f0f, roughness: 0.5, metalness: 0.04 });
      this.zip = new THREE.MeshStandardMaterial({ color: 0x1e1e1e, roughness: 0.3, metalness: 0.6 });
      this.mats = [this.face, this.rim, this.zip];
      this.body = null;
      this.layer = 0;
      this.s = null;
      this.build();
      scene.add(this.group);
      sleeves.push(this);
    }
    Sleeve.prototype.build = function () {
      if (this.body) this.group.remove(this.body);
      var b = new THREE.Group();
      b.add(new THREE.Mesh(GEO.front, this.face), new THREE.Mesh(GEO.back, this.face),
        new THREE.Mesh(GEO.rim, this.rim), new THREE.Mesh(GEO.zip, this.zip));
      var pull = new THREE.Mesh(GEO.pull, this.zip);
      pull.position.set(-(W / 2 + T + 0.045), H * 0.3, 0.01); pull.rotation.z = 0.12;
      b.add(pull);
      this.body = b; this.group.add(b); this.setLayer(this.layer, true);
    };
    Sleeve.prototype.useModel = function () {
      if (!template) return;
      var body = template.clone(true), printMesh = null, first = null, mats = [];
      body.traverse(function (o) {
        if (!o.isMesh) return;
        if (!first) first = o;
        if (!printMesh && /print/i.test(o.name)) printMesh = o;
        o.material = Array.isArray(o.material) ? o.material.map(function (m) { return m.clone(); }) : o.material.clone();
        (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) { mats.push(m); });
      });
      var target = printMesh || first;
      if (target) {
        var m0 = Array.isArray(target.material) ? target.material[0] : target.material;
        m0.map = print(this.key).gltf; m0.needsUpdate = true;
      }
      if (this.body) this.group.remove(this.body);
      this.body = body; this.group.add(body); this.mats = mats;
      this.setLayer(this.layer, true);
      this.setOpacity(1);
    };
    Sleeve.prototype.setLayer = function (l, force) {
      if (l === this.layer && !force) return;
      this.layer = l;
      this.group.traverse(function (o) { o.layers.set(l); });
    };
    Sleeve.prototype.setOpacity = function (o) {
      var tr = o < 0.995;
      this.mats.forEach(function (m) {
        if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; }
        m.opacity = o;
      });
    };
    Sleeve.prototype.hide = function () { this.group.visible = false; this.s = null; };
    Sleeve.prototype.apply = function (p, k) {
      var s = this.s;
      if (p.o === undefined) p.o = 1;
      if (!s || k >= 1) { s = this.s = {}; FIELDS.forEach(function (f) { s[f] = p[f] || 0; }); }
      else FIELDS.forEach(function (f) { s[f] += ((p[f] || 0) - s[f]) * k; });
      var hz = (CAMZ - s.z) * TAN, g = this.group;
      g.position.set(s.x * hz * aspect, s.y * hz, s.z);
      g.rotation.set(s.rx * RAD, s.ry * RAD, s.rz * RAD);
      var visW0 = 2 * CAMZ * TAN * aspect, visH0 = 2 * CAMZ * TAN;
      g.scale.setScalar(Math.min(s.w * visW0 / W, 0.62 * visH0 / H));
      this.setOpacity(clamp(s.o, 0, 1));
      this.setLayer(p.blur && blurOn ? 1 : 0);
      g.visible = s.o > 0.004 && s.z < CAMZ - 0.12;
    };

    /* ---------- acts ---------- */
    var acts = [];
    function act(sel, keys, o) {
      var el = document.querySelector(sel);
      if (!el) return;
      o.el = el;
      o.sleeves = keys.map(function (k) { return new Sleeve(k); });
      o.keys = keys;
      o.pin = el.classList.contains('pin');
      o.from = o.from === undefined ? -1.15 : o.from;
      o.on = false; o.top = 0; o.hv = 1; o.stuck = 0;
      acts.push(o);
    }
    var lanes = [[205, 0], [335, 1], [72, 2], [148, 3], [18, 4]];

    act('#top', ['midnight'], {
      from: -1, pose: function (v, c) {
        var M = c.M, it = E.o(c.intro), t = E.io(seg(v, 0.04, 1.42)), calm = 1 - t;
        var b = M ? { x: 0, y: 0.17, w: 0.62 } : { x: 0.02, y: 0.25, w: 0.265 };
        return [{
          x: mix(b.x, M ? 1.35 : 1.6, t) + c.px * 0.015 * calm,
          y: mix(b.y + Math.sin(c.t * 0.9) * 0.012, M ? -1.6 : -1.75, t) + c.follow,
          z: mix(-34, 0, it) + 6.5 * t,
          rx: mix(8, -8, t) - c.py * 6 * calm,
          ry: mix(mix(-62, -18, it), 34, t) + c.px * 10 * calm,
          rz: mix(-3 + Math.sin(c.t * 0.6) * 1.2, 21, t),
          w: b.w
        }];
      }
    });
    act('#about', ['royale'], {
      from: -2.25, to: 0.35, pose: function (v, c) {
        if (c.M) return [null];
        var e = E.o(seg(v, -2.1, -1.0)), d = Math.max(0, v + 1);
        return [{
          x: mix(0.2, 0.5, e), y: mix(0.45, 0.3, e) + d * 1.25, z: mix(-46, -10, e),
          rx: 10, ry: mix(42, 16, e) + Math.sin(c.t * 0.5) * 3, rz: mix(-10, -5, e), w: 0.2
        }];
      }
    });
    act('.work-intro', ['matcha', 'ocean'], {
      from: -1.1, to: 1.55, pose: function (v, c) {
        var M = c.M, a = seg(v, -1.05, 0.4), ea = E.sine(a), b = seg(v, -0.7, 1.5);
        return [
          { x: mix(1.45, -1.5, ea), y: mix(-1.0, 0.95, ea), z: 2.2, rx: mix(16, -10, a), ry: mix(-38, 30, a), rz: mix(-16, 12, a), w: M ? 0.62 : 0.3 },
          { x: mix(-1.35, 1.35, b), y: M ? mix(-0.62, -0.4, b) : mix(-0.1, 0.28, b), z: -9, rx: 8, ry: mix(28, -24, b), rz: mix(8, -6, b), w: M ? 0.4 : 0.21, blur: 1 }
        ];
      }
    });
    act('.vi', ['wildcat'], {
      from: -1.0, to: 1.3, pose: function (v, c) {
        var a = seg(v, -0.95, 0.6), r = E.io(seg(v, 0.58, 1.0)), out = E.io(seg(v, 0.9, 1.2));
        if (v > 1.22) return [null];
        return [{
          x: mix(0, -0.12, r) - out * 2.6, y: mix(0.04, 0, a), z: mix(-38, 7.5, Math.pow(a, 2.2)) - out * 2,
          rx: mix(12, 0, E.o(a)), ry: mix(-16, 0, E.o(a)) + r * 90, rz: mix(-5, 0, E.o(a)),
          w: c.M ? 0.6 : 0.3
        }];
      }
    });
    act('.model', ['panther', 'wildcat', 'mint'], {
      labels: Array.prototype.slice.call(document.querySelectorAll('.model .op')),
      pose: function (v, c) {
        var M = c.M, s = E.io(seg(v, 0.12, 0.85)), out = [];
        var D = M ? [[0.44, 0.34], [0.44, -0.1], [0.44, -0.54]] : [[-0.58, 0.02], [0, -0.03], [0.58, 0.02]];
        var RY = M ? [-16, -16, -16] : [18, 0, -18];
        for (var i = 0; i < 3; i++) {
          out.push({
            x: mix(0.05 + i * 0.06, D[i][0], s),
            y: mix(-0.02 + i * 0.07, D[i][1], s) + Math.sin(c.t * 0.8 + i * 1.7) * 0.01 + c.follow,
            z: mix(-i * 2.6, -1.5, s), rx: mix(12, 6, s),
            ry: mix(-28, RY[i], s) + Math.sin(c.t * 0.5 + i) * 2, rz: mix(-4 + i * 3, 0, s),
            w: M ? 0.32 : 0.2, lo: seg(v, 0.55, 0.85)
          });
        }
        return out;
      }
    });
    act('.kpi', ['waves'], {
      pose: function (v, c) {
        var a = seg(v, -0.35, 1.25);
        return [{ x: mix(-1.45, 1.45, a), y: mix(-0.28, 0.18, a) + Math.sin(c.t * 0.7) * 0.01, z: -3.5,
          rx: 10, ry: mix(38, -38, a), rz: mix(9, -7, a), w: c.M ? 0.6 : 0.34 }];
      }
    });
    act('.worlds', ['mint', 'panther', 'doodle', 'ocean'], {
      pose: function (v, c) {
        var M = c.M, f = c.follow, bw = M ? 0.5 : 0.26;
        var s0 = seg(v, 0.02, 0.5), s1 = E.io(seg(v, 0.1, 0.6)), s2 = E.io(seg(v, 0.16, 0.68)), s3 = E.io(seg(v, 0.22, 0.75));
        var fl = function (i) { return Math.sin(c.t * 0.8 + i * 2) * 0.008; };
        var st = function (i) { return { x: 0.02 * i - 0.03, y: 0.035 * i + f, z: -1.3 * i, ry: -22 + i * 3, rz: -6 + i * 2.5 }; };
        var p0 = st(0), p1 = st(1), p2 = st(2), p3 = st(3);
        return [
          { x: p0.x - 0.12 * s0, y: p0.y + fl(0), z: p0.z + Math.pow(s0, 2.2) * 14.5, rx: mix(14, 2, s0), ry: mix(p0.ry, 10, s0), rz: p0.rz, w: bw },
          { x: mix(p1.x, -1.4, s1), y: p1.y + fl(1) + s1 * 0.1, z: p1.z, rx: 14, ry: mix(p1.ry, 35, s1), rz: mix(p1.rz, -14, s1), w: bw },
          M ? null : { x: mix(p2.x, 1.4, s2), y: p2.y + fl(2) - s2 * 0.1, z: p2.z, rx: 14, ry: mix(p2.ry, -40, s2), rz: mix(p2.rz, 12, s2), w: bw },
          { x: p3.x + s3 * 0.05, y: mix(p3.y, 1.5, s3) + fl(3), z: p3.z, rx: mix(14, -32, s3), ry: p3.ry, rz: p3.rz, w: bw }
        ];
      }
    });
    act('.artifacts', ['royale', 'matcha', 'monogeo', 'wildcat', 'navy'], {
      pose: function (v, c) {
        return lanes.map(function (L, i) {
          if (c.M && i > 2) return null;
          var a = seg(v, -0.8 + L[1] * 0.28, 0.3 + L[1] * 0.28);
          if (a <= 0 || a >= 1) return null;
          var e = Math.pow(a, 1.8), ang = L[0] * RAD, r = mix(0.1, 2.3, Math.pow(e, 1.2)), sg = i % 2 ? 1 : -1;
          return {
            x: Math.cos(ang) * r * 0.9, y: Math.sin(ang) * r, z: mix(-34, 8.5, e),
            rx: mix(20, -10, a) + i * 4, ry: mix(-30 * sg, 25 * sg, a), rz: mix(-10, 15, a) * sg,
            w: c.M ? 0.5 : 0.24
          };
        });
      }
    });
    act('.contact', ['midnight'], {
      from: -1.05, pose: function (v, c) {
        var M = c.M, end = Math.max(0, c.hv - 1), d = v - end;
        return [{
          x: (M ? 0.55 : 0.6) + c.px * 0.02, y: (M ? -0.25 : 0.24) + d * 1.6 + Math.sin(c.t * 0.8) * 0.012,
          z: M ? -3 : -1.2, rx: 8 - c.py * 5 + d * 8, ry: -24 + c.px * 8 + Math.sin(c.t * 0.4) * 2,
          rz: 3 - d * 10, w: M ? 0.56 : 0.27
        }];
      }
    });

    /* ---------- pointer / device ---------- */
    var ptr = { tx: 0, ty: 0, x: 0, y: 0 };
    if (!coarse) {
      addEventListener('pointermove', function (e) {
        ptr.tx = e.clientX / innerWidth * 2 - 1; ptr.ty = -(e.clientY / innerHeight * 2 - 1);
      }, { passive: true });
    } else if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission !== 'function') {
      addEventListener('deviceorientation', function (e) {
        if (e.gamma == null) return;
        ptr.tx = clamp(e.gamma / 30, -1, 1) * 0.6; ptr.ty = clamp((e.beta - 45) / 30, -1, 1) * 0.4;
      }, { passive: true });
    }

    /* ---------- layout ---------- */
    var aspect = innerWidth / innerHeight, vh = innerHeight, vw = innerWidth, dpr = 1, dirty = true, padPx = 20;
    function resize() {
      vw = innerWidth; vh = innerHeight; aspect = vw / vh;
      dpr = Math.min(window.devicePixelRatio || 1, dprCap);
      renderer.setPixelRatio(dpr);
      renderer.setSize(vw, vh, false);
      camera.aspect = aspect; camera.updateProjectionMatrix();
      var rw = Math.max(2, Math.round(vw * dpr * 0.25)), rh = Math.max(2, Math.round(vh * dpr * 0.25));
      rt.setSize(rw, rh); bMat.uniforms.uTexel.value.set(1 / rw, 1 / rh);
      dirty = true;
    }
    function measure() {
      var y = window.scrollY;
      vh = innerHeight;
      acts.forEach(function (a) {
        var r = a.el.getBoundingClientRect();
        a.top = r.top + y;
        a.hv = a.el.offsetHeight / vh;
        a.stuck = a.pin ? Math.max(0, a.hv - 1) : 0;
        if (a.labels) {
          a.lsize = a.labels.map(function (l) { return [l.offsetWidth, l.offsetHeight]; });
          padPx = parseFloat(getComputedStyle(a.labels[0].parentNode.parentNode).paddingLeft) || 20;
        }
      });
      dirty = true;
    }
    var rt0;
    addEventListener('resize', function () { clearTimeout(rt0); rt0 = setTimeout(function () { resize(); measure(); }, 90); });

    /* ---------- theme ---------- */
    var tmpC = new THREE.Color();
    function setBackdrop(css) {
      try { tmpC.setStyle(css); } catch (e) { return; }
      scene.fog.color.copy(tmpC);
      var L = 0.2126 * tmpC.r + 0.7152 * tmpC.g + 0.0722 * tmpC.b;   // linear luminance
      hemi.intensity = mix(0.38, 0.55, L);
      rim.intensity = mix(1.7, 0.8, L);
      key.intensity = mix(1.1, 1.0, L);
      dirty = true;
    }

    /* ---------- intro ---------- */
    var introT = 0;
    function intro(dur) {
      var o = { t: 0 };
      if (window.gsap) window.gsap.to(o, { t: 1, duration: dur || 1.8, ease: 'expo.out', onUpdate: function () { introT = o.t; } });
      else introT = 1;
    }

    /* ---------- loop ---------- */
    var clock = 0, last = 0, frames = 0, slow = 0, wasVisible = false;
    var ctx = { M: false, t: 0, px: 0, py: 0, intro: 0, follow: 0, hv: 1, stuck: 0 };
    var vtmp = new THREE.Vector3();
    function placeLabels(a, v, poses) {
      var stageTop = v < 0 ? -v * vh : v > a.stuck ? -(v - a.stuck) * vh : 0;
      a.sleeves.forEach(function (s, i) {
        var el = a.labels[i], p = poses[i];
        if (!el) return;
        if (!p || !s.group.visible) { el.style.opacity = 0; return; }
        s.group.updateMatrixWorld(true);
        var sz = a.lsize[i] || [200, 80], x, y;
        if (ctx.M) {
          vtmp.set(0, 0, 0).applyMatrix4(s.group.matrixWorld).project(camera);
          x = padPx; y = (1 - vtmp.y) / 2 * vh - sz[1] / 2;
        } else {
          vtmp.set(0, -H / 2 - T * 2, 0).applyMatrix4(s.group.matrixWorld).project(camera);
          x = (vtmp.x + 1) / 2 * vw - sz[0] / 2; y = (1 - vtmp.y) / 2 * vh + 18;
        }
        el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + (y - stageTop).toFixed(1) + 'px,0)';
        el.style.opacity = (p.lo || 0).toFixed(3);
      });
    }
    function render(anyBlur) {
      renderer.setRenderTarget(null);
      renderer.clear();
      if (anyBlur && blurOn) {
        camera.layers.set(1);
        renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, camera);
        renderer.setRenderTarget(null); renderer.render(bScene, bCam);
      }
      camera.layers.set(0);
      renderer.render(scene, camera);
    }
    function tick(now) {
      var dt = last ? Math.min((now - last) / 1000, 0.1) : 0.016;
      last = now; clock += dt;
      var kp = 1 - Math.exp(-dt * 3.2), k = 1 - Math.exp(-dt * 9);
      ptr.x += (ptr.tx - ptr.x) * kp; ptr.y += (ptr.ty - ptr.y) * kp;
      ctx.M = vw < 768; ctx.t = clock; ctx.px = ptr.x; ctx.py = ptr.y; ctx.intro = introT;

      var y = window.scrollY, anyVisible = false, anyBlur = false;
      acts.forEach(function (a) {
        var v = (y - a.top) / vh, to = a.to === undefined ? a.hv + 0.1 : a.to;
        var on = v >= a.from && v <= to;
        if (v >= a.from - 1.2 && v <= to) a.keys.forEach(ensurePrint);
        if (!on) {
          if (a.on) {
            a.sleeves.forEach(function (s) { s.hide(); });
            if (a.labels) a.labels.forEach(function (l) { l.style.opacity = 0; });
            dirty = true;
          }
          a.on = false;
          return;
        }
        var snap = !a.on; a.on = true;
        ctx.hv = a.hv; ctx.stuck = a.stuck;
        ctx.follow = a.pin ? (v < 0 ? v * 2 : v > a.stuck ? (v - a.stuck) * 2 : 0) : 0;
        var poses = a.pose(v, ctx);
        a.sleeves.forEach(function (s, i) {
          var p = poses[i];
          if (!p) { if (s.group.visible) dirty = true; s.hide(); return; }
          s.apply(p, snap ? 1 : k);
          if (s.group.visible) { anyVisible = true; if (s.layer === 1) anyBlur = true; }
        });
        if (a.labels) placeLabels(a, v, poses);
      });

      if (anyVisible || dirty || wasVisible) {
        render(anyBlur);
        dirty = false;
        if (anyVisible && dt > 0) {
          frames++; slow += dt;
          if (frames >= 90) {
            if (slow / frames > 0.026 && dpr > 1) { dprCap = Math.max(1, dpr - 0.25); blurOn = blurOn && dpr > 1.25; resize(); }
            frames = 0; slow = 0;
          }
        }
      }
      wasVisible = anyVisible;
    }

    canvas.addEventListener('webglcontextlost', function (e) {
      e.preventDefault();
      html.classList.remove('webgl'); html.classList.add('no-webgl');
      if (window.gsap) window.gsap.ticker.remove(gtick);
      acts.forEach(function (a) { if (a.labels) a.labels.forEach(function (l) { l.style.transform = ''; l.style.opacity = ''; }); });
    });

    var gtick = function (time) { tick(time * 1000); };
    resize();
    measure();
    if (window.gsap) window.gsap.ticker.add(gtick);
    else (function raf(t) { tick(t); requestAnimationFrame(raf); })(0);

    Stage.measure = measure;
    Stage.intro = intro;
    Stage.setBackdrop = setBackdrop;
    Stage.renderer = renderer;
    Stage.ready = Promise.race([Promise.all([loadModel(), ensurePrint('midnight')]), new Promise(function (r) { setTimeout(r, 4000); })]);
    return true;
  }
})();
