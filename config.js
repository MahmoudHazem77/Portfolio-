/* =====================================================================
   MAHMOUD HAZEM — PORTFOLIO CONFIG
   ---------------------------------------------------------------------
   Everything replaceable lives here.

   CREATIVES  → every gallery image on the site, numbered in page order.
                `src` is the web file in assets/creatives/.
                `original` is the file name as exported from the design
                tool; tools/prepare-assets.py uses it to rebuild the web
                files. To add a creative: add an object here, list its id
                in `layout`, then run the tool.

   SLEEVES    → the 3D sleeve colourways. `color` is the fabric colour.
                Optional `print` puts an image on the sleeve face instead.

   MODEL      → set `url` to a .glb to replace the procedural sleeve mesh.
                Choreography is unchanged — see README.md.
   ===================================================================== */

window.PORTFOLIO_CONFIG = {
  /* false = skip every creative request and show branded placeholders. */
  assetsAvailable: true,

  /* Show the expected file path inside a frame whose image is missing. */
  showSlotHints: false,

  creatives: [
    /* performance feed */
    { id: 'c01', title: 'Curious Cats',           world: 'Playful', kind: 'image', src: 'assets/creatives/curious-cats.webp',          original: 'ChatGPT_Image_Jun_18__2026__04_15_43_PM.png' },
    { id: 'c02', title: 'Deadline Panic',         world: 'Playful', kind: 'image', src: 'assets/creatives/deadline-panic.webp',        original: 'ChatGPT_Image_Aug_3__2026__01_28_31_AM.png' },
    { id: 'c03', title: 'Purr & Pour',            world: 'Playful', kind: 'image', src: 'assets/creatives/purr-and-pour.webp',         original: 'ChatGPT_Image_Aug_30__2026__02_40_55_PM.png' },
    /* stacked gallery */
    { id: 'c04', title: 'Wildcat Noir',           world: 'Wild',    kind: 'image', src: 'assets/creatives/wildcat-noir.webp',          original: 'ChatGPT_Image_Aug_14__2026__01_45_57_PM.png' },
    { id: 'c05', title: 'Midnight Minimal',       world: 'Minimal', kind: 'image', src: 'assets/creatives/midnight-minimal.webp',      original: 'ChatGPT_Image_Aug_13__2026__03_35_56_PM.png' },
    { id: 'c06', title: 'Pink Panther Bloom',     world: 'Wild',    kind: 'image', src: 'assets/creatives/pink-panther-bloom.webp',    original: 'ChatGPT_Image_Aug_3__2026__01_11_11_AM.png' },
    { id: 'c07', title: 'Urban Doodle',           world: 'Playful', kind: 'image', src: 'assets/creatives/urban-doodle.webp',          original: 'ChatGPT_Image_Sep_2__2026__01_32_09_PM.png' },
    /* campaign reel */
    { id: 'c08', title: 'Mono Geo',               world: 'Pattern', kind: 'image', src: 'assets/creatives/mono-geo.webp',              original: 'ChatGPT_Image_Aug_10__2026__03_33_04_PM.png' },
    { id: 'c09', title: 'Redline Topo',           world: 'Pattern', kind: 'image', src: 'assets/creatives/redline-topo.webp',          original: 'ChatGPT_Image_Aug_11__2026__02_51_38_PM.png' },
    { id: 'c10', title: 'Crimson Aurora',         world: 'Pattern', kind: 'image', src: 'assets/creatives/crimson-aurora.webp',        original: 'ChatGPT_Image_Aug_17__2026__04_48_33_PM.png' },
    { id: 'c11', title: 'Midnight Waves',         world: 'Pattern', kind: 'image', src: 'assets/creatives/midnight-waves.webp',        original: 'Firefly__4_.png' },
    { id: 'c12', title: 'Wine Core',              world: 'Minimal', kind: 'image', src: 'assets/creatives/wine-core.webp',             original: 'ChatGPT_Image_Sep_2__2026__01_54_04_PM.png' },
    { id: 'c13', title: 'Navy Shadow',            world: 'Minimal', kind: 'image', src: 'assets/creatives/navy-shadow.webp',           original: 'ChatGPT_Image_Aug_10__2026__03_48_50_PM.png' },
    /* archive */
    { id: 'c14', title: 'Redline Topo — detail',  world: 'Craft',   kind: 'image', src: 'assets/creatives/redline-topo-detail.webp',   original: 'ChatGPT_Image_Aug_11__2026__02_51_47_PM.png' },
    { id: 'c15', title: 'Crimson Aurora — detail', world: 'Craft',  kind: 'image', src: 'assets/creatives/crimson-aurora-detail.webp', original: 'ChatGPT_Image_Aug_17__2026__04_51_42_PM.png' },
    { id: 'c16', title: 'Pixel Rampage',          world: 'Playful', kind: 'image', src: 'assets/creatives/pixel-rampage.webp',         original: 'ChatGPT_Image_Aug_10__2026__03_19_58_PM.png' },
    { id: 'c17', title: 'This Is Fine',           world: 'Playful', kind: 'image', src: 'assets/creatives/this-is-fine.webp',          original: 'ChatGPT_Image_Aug_3__2026__01_21_59_AM.png' },
    { id: 'c18', title: 'Block Craft',            world: 'Playful', kind: 'image', src: 'assets/creatives/block-craft.webp',           original: 'ChatGPT_Image_Aug_10__2026__03_41_37_PM.png' },
    { id: 'c19', title: 'Color Maze — detail',    world: 'Craft',   kind: 'image', src: 'assets/creatives/color-maze-detail.webp',     original: 'ChatGPT_Image_Aug_17__2026__04_16_05_PM.png' },
    { id: 'c20', title: 'Glisse d’Hiver',         world: 'Seasonal', kind: 'image', src: 'assets/creatives/glisse-dhiver.webp',        original: 'ChatGPT_Image_Aug_19__2026__01_03_45_PM.png' }
  ],

  /* Where each creative appears. Reorder or remove ids freely. */
  layout: {
    performance: ['c01', 'c02', 'c03'],
    stack:       ['c04', 'c05', 'c06', 'c07'],
    reel:        ['c08', 'c09', 'c10', 'c11', 'c12', 'c13'],
    archive:     ['c14', 'c15', 'c16', 'c17', 'c18', 'c19', 'c20'],
    workPreview: 'c04'
  },

  sleeves: {
    /* Solid fabric colourways for the 3D sleeves (the look of the main
       portfolio). To print a creative on a colourway instead, add
       print: 'assets/prints/<name>.webp' (the tool can cut one: add
       from: '<creative id>', crop: [left, top, right, bottom]). */
    midnight: { name: 'Midnight Minimal',   color: '#161616' },
    navy:     { name: 'Navy Shadow',        color: '#1d2740' },
    matcha:   { name: 'Matcha Glow',        color: '#c9d7a2' },
    wildcat:  { name: 'Wildcat Noir',       color: '#6c1320' },
    doodle:   { name: 'Urban Doodle',       color: '#8d8a84' },
    monogeo:  { name: 'Mono Geo',           color: '#1a1a1a' },
    panther:  { name: 'Pink Panther Bloom', color: '#0f4f36' },
    mint:     { name: 'Mint Wild',          color: '#bcd9c8' },
    ocean:    { name: 'Ocean Layers',       color: '#1c355d' },
    royale:   { name: 'Sweet Royale',       color: '#e3a3b8' },
    waves:    { name: 'Midnight Waves',     color: '#15285a' }
  },

  model: {
    /* e.g. 'assets/models/velvra-sleeve.glb'. The mesh named "Print"
       (or the first mesh) receives the sleeve texture. */
    url: '',
    draco: false,
    scale: 1
  }
};
