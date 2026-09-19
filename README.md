# Mahmoud Hazem — Portfolio 2026

Static site. No build step, no CDN: every library and font is inside this folder.

## Run it

```
cd mahmoud-hazem-portfolio
python3 -m http.server 8080        # or: npx serve .
```
Open http://localhost:8080. Opening `index.html` by double-click also works, but browsers block
some features on `file://` (fonts in some browsers), so use a server.

**Deploy:** drag the folder onto Netlify Drop, or push it to GitHub Pages / Vercel / Cloudflare Pages.
Any static host works.

## 1. Creatives

All twenty VELVRA creatives are already in place as optimised WebP files (a full-size and an
800 px version each; phones get the small one), shown with soft rounded corners.

| Slot | Title | File | Appears in |
|---|---|---|---|
| c01 | Curious Cats | `curious-cats.webp` | Performance feed |
| c02 | Deadline Panic | `deadline-panic.webp` | Performance feed |
| c03 | Purr & Pour | `purr-and-pour.webp` | Performance feed |
| c04 | Wildcat Noir | `wildcat-noir.webp` | Stacked gallery, Work-list hover |
| c05 | Midnight Minimal | `midnight-minimal.webp` | Stacked gallery |
| c06 | Pink Panther Bloom | `pink-panther-bloom.webp` | Stacked gallery |
| c07 | Urban Doodle | `urban-doodle.webp` | Stacked gallery |
| c08 | Mono Geo | `mono-geo.webp` | Campaign reel |
| c09 | Redline Topo | `redline-topo.webp` | Campaign reel |
| c10 | Crimson Aurora | `crimson-aurora.webp` | Campaign reel |
| c11 | Midnight Waves | `midnight-waves.webp` | Campaign reel |
| c12 | Wine Core | `wine-core.webp` | Campaign reel |
| c13 | Navy Shadow | `navy-shadow.webp` | Campaign reel |
| c14 | Redline Topo — detail | `redline-topo-detail.webp` | Archive |
| c15 | Crimson Aurora — detail | `crimson-aurora-detail.webp` | Archive |
| c16 | Pixel Rampage | `pixel-rampage.webp` | Archive |
| c17 | This Is Fine | `this-is-fine.webp` | Archive |
| c18 | Block Craft | `block-craft.webp` | Archive |
| c19 | Color Maze — detail | `color-maze-detail.webp` | Archive |
| c20 | Glisse d’Hiver | `glisse-dhiver.webp` | Archive |

**Replace or add a creative:** put the new export in a folder, add or edit its entry in
`js/config.js → creatives` (set `original` to the export's file name), list its id in `layout`, then run

```
pip install pillow
python3 tools/prepare-assets.py path/to/folder-with-exports
```

The tool rebuilds the WebP files and rewrites `js/assets-manifest.js`.
To remove a creative, delete its id from `layout`. Each gallery reflows on its own.

**3D sleeve colours:** each colourway in `js/config.js → sleeves` is a solid fabric `color`.
To print a creative on one instead, add `from: '<creative id>'` and
`crop: [left, top, right, bottom]` (0–1 fractions) plus `print: 'assets/prints/<name>.webp'`, then run the tool.

**Social preview:** `assets/og.jpg` is the link-share image. Most platforms need an absolute URL, so after
deploying change `og:image` in `index.html` to `https://your-domain/assets/og.jpg`.

## 2. Swap in a real 3D sleeve model (optional)

1. Export the sleeve as `.glb` (Blender: File → Export → glTF Binary). Face the printed side toward +Z,
   width along X. Name the printed-face mesh `Print`.
2. Put it in `assets/models/` and set `model.url` in `js/config.js`
   (for Draco-compressed files also set `draco: true`; the decoder is in `vendor/draco/`).
3. Use `model.scale` to fine-tune size.

Every sleeve switches to the model and keeps the same scroll choreography and colourways.
If the file fails to load, the built-in procedural sleeve is used.

## 3. Edit text and figures

All copy lives in `index.html`, in chapter order (01 Intro → 09 Contact). The performance figures are
the verified VELVRA numbers from the brief. Animated counters read their target from `data-count`
(with `data-prefix`, `data-suffix`, `data-dec`), so change the visible text and the attribute together.
The COD and KPI-hero numbers are set in `js/main.js` (search `427`, `38.8`, `1.83`, `1.1`).

## What's inside

| Path | Purpose |
|---|---|
| `index.html` | Document and all copy |
| `css/style.css` | Design system, layouts, responsive and reduced-motion rules |
| `js/config.js` | Creative slots, gallery layout, sleeve colourways, 3D model |
| `js/media.js` | Loads each creative from the manifest (falls back to .webp/.png/.jpg) |
| `assets/` | `creatives/` gallery images · `og.jpg` share image |
| `js/stage.js` | Three.js sleeve layer and its scroll choreography |
| `js/main.js` | Preloader, smooth scroll, galleries, scroll scenes, cursor, lightbox |
| `tools/prepare-assets.py` | Resize and convert creatives (and optional sleeve prints), write the manifest |
| `vendor/` | three.js r147, GSAP 3.12.5 + ScrollTrigger, Lenis 1.1.20, glTF/Draco loaders |
| `fonts/` | Bodoni Moda and Archivo variable fonts (OFL) |

**Behaviour notes**
- Reduced motion (OS setting) turns the site into a static, fully readable page: no preloader,
  no pinned scenes, no 3D, final numbers shown immediately.
- Without WebGL, CSS-drawn sleeves replace the 3D ones and every section still works.
- Phones get fewer sleeves, lower render resolution, no blur pass, and a swipe carousel
  instead of the horizontal scroll scene. The frame rate is monitored and resolution drops
  automatically on slow devices.
- Images load lazily as they approach the viewport; videos play only while visible.
- Keyboard: skip link, visible focus, gallery items open in a viewer (Enter, arrow keys, Esc).
