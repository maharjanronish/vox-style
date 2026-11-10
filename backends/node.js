// backends/node.js — Node canvas backend (skia-canvas or @napi-rs/canvas): fonts, images, raw pixels, project loading.
// Usage: const proj = await loadNodeProject({ project:'test10', lib:'skia' });
//        const fr = makeFrameRenderer(proj); await fr.draw(1.5); const rgba = await proj.be.raw(fr.canvas);
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, discoverProps, toDefs } from '../tools/lib/registry.mjs';
import { FONTS } from '../tools/lib/fonts.mjs';

export const SIZES = { '9:16': { W: 1080, H: 1920 }, '16:9': { W: 1920, H: 1080 } };

async function loadLib(name) {
  if (name === 'napi') {
    const m = await import('@napi-rs/canvas');
    return {
      createCanvas: (w, h) => m.createCanvas(w, h), loadImage: (p) => m.loadImage(p),
      registerFont: (family, file) => m.GlobalFonts.registerFromPath(file, family),
      png: (c) => c.encode('png'), raw: [['data()', (c) => c.data()]],
    };
  }
  const m = await import('skia-canvas');
  const S = m.default ?? m;
  return {
    createCanvas: (w, h) => new S.Canvas(w, h), loadImage: (p) => S.loadImage(p),
    registerFont: (family, file) => S.FontLibrary.use(family, [file]),
    png: (c) => c.toBuffer('png'), raw: [["toBuffer('raw')", (c) => c.toBuffer('raw')]],
  };
}

const viaImageData = ['getImageData', (c) => Buffer.from(c.getContext('2d').getImageData(0, 0, c.width, c.height).data.buffer)];

/** Pick the first raw-pixel export that returns correct RGBA (self-calibrating). */
async function pickRaw(lib) {
  const c = lib.createCanvas(2, 2), x = c.getContext('2d');
  x.fillStyle = 'rgb(255,0,0)'; x.fillRect(0, 0, 1, 2);
  x.fillStyle = 'rgb(0,0,255)'; x.fillRect(1, 0, 1, 2);
  for (const [name, fn] of [...lib.raw, viaImageData]) {
    try {
      const b = await fn(c);
      if (b.length === 16 && b[0] === 255 && b[1] === 0 && b[2] === 0 && b[3] === 255 && b[4] === 0 && b[5] === 0 && b[6] === 255 && b[7] === 255) return { name, fn };
    } catch { /* try next */ }
  }
  throw new Error('no usable raw-pixel export for this canvas library');
}

export async function createNodeBackend({ lib = 'skia', root = ROOT } = {}) {
  const L = await loadLib(lib);
  const fonts = [];
  for (const f of FONTS) {
    const p = path.join(root, 'fonts', f.file);
    if (!fs.existsSync(p)) continue;
    try { L.registerFont(f.family, p); fonts.push(f.family); } catch { /* reported by doctor */ }
  }
  const pick = await pickRaw(L);
  return { name: lib, createCanvas: L.createCanvas, loadImage: L.loadImage, png: L.png, raw: pick.fn, rawName: pick.name, fonts };
}

export function duration(proj) {
  const tl = proj.timeline;
  const n = [tl?.duration, tl?.total, tl?.end, tl?.length].find((v) => typeof v === 'number' && v > 0);
  if (n) return n;
  const last = tl?.shots?.at?.(-1);
  const e = [last?.end, last?.t1, last?.to].find((v) => typeof v === 'number');
  if (e) return e;
  throw new Error(`cannot find the timeline duration (timeline keys: ${Object.keys(tl ?? {}).join(', ')})`);
}

export async function loadNodeProject({ project, aspect = '9:16', strict = true, lib = 'skia', backend = null, root = ROOT }) {
  const be = backend ?? await createNodeBackend({ lib, root });
  const { loadProject } = await import(pathToFileURL(path.join(root, 'core/project.js')).href);
  const projectDir = path.join(root, 'projects', project);
  const { props } = await discoverProps({ root, project });
  const find = (p) => {
  const input = String(p);

  const candidates = [
    path.isAbsolute(input) ? input : null,
    path.join(projectDir, input.replace(/^[/\\]+/, '')),
    path.join(root, input.replace(/^[/\\]+/, '')),
    path.join(projectDir, 'assets', input.replace(/^[/\\]+/, '')),
  ];

  return candidates
    .filter(Boolean)
    .find((file) => fs.existsSync(file) && fs.statSync(file).isFile());
};
  const noFile = (p) => Object.assign(new Error(`ENOENT: ${p}`), { code: 'ENOENT' });
  const loaded = await loadProject({
    readJSON: async (p) => { const f = find(p); if (!f) throw noFile(p); return JSON.parse(fs.readFileSync(f, 'utf8')); },
    loadImage: async (p) => { const f = find(p); if (!f) throw noFile(p); return be.loadImage(f); },
    createCanvas: be.createCanvas,
    resolvePath: (p) => find(p) ?? p,
    props: toDefs(props), aspect, strict,
  });
  return { ...loaded, be, size: SIZES[aspect] ?? SIZES['9:16'] };
}

/** Wraps proj.renderer so callers just do `await fr.draw(t)`. Probes the call signature once. */
export function makeFrameRenderer(proj) {
  const { W, H } = proj.size;
  const canvas = proj.be.createCanvas(W, H), ctx = canvas.getContext('2d');
  const r = proj.renderer;
  const name = ['renderFrame', 'render', 'draw', 'frame'].find((k) => typeof r?.[k] === 'function');
  if (!name && typeof r !== 'function') throw new Error(`renderer has no known draw method (keys: ${Object.keys(r ?? {}).join(', ')})`);
  const call = (a, b) => (name ? r[name](a, b) : r(a, b));
  let order = null;
  return {
    canvas, ctx, W, H,
    async draw(t) {
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, W, H);
      if (order === 'tc') return call(t, ctx);
      if (order === 'ct') return call(ctx, t);
      try { await call(ctx, t); order = 'ct'; }
      catch (e1) {
        if (!(e1 instanceof TypeError)) throw e1;
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H);
        try { await call(t, ctx); order = 'tc'; } catch { throw e1; }
      }
    },
  };
}
