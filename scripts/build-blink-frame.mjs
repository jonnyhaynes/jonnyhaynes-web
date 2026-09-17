// Builds the portrait's closed-eye frame from the cut-out itself.
//
// The blink swaps between two real images rather than painting lids over one: flat
// shapes over a photograph read as shapes, and they have to cross the glasses frame
// to reach the eye. Here the eye is covered with skin cloned from immediately below
// it — same pixels, same light, same grain — masked with a soft ellipse so the join
// doesn't show at the edges.
//
// The glasses survive because the clone lands inside the lens, not across the frame.
//
// Usage: node scripts/build-blink-frame.mjs [source.webp]
// Output: public/images/portrait-blink-{480,960}.webp (committed)

import { writeFileSync } from 'node:fs';

import sharp from 'sharp';

const SRC = process.argv[2] ?? 'public/images/portrait-cutout-960.webp';

/**
 * The eye boxes, as percentages of the image, measured off the cut-out with a
 * percentage grid rendered over it. His head is turned, so both sit well right of
 * where a frontal portrait would put them.
 */
const EYES = [
  [46.0, 37.4, 7.0, 3.2],
  [67.2, 36.7, 7.0, 3.2],
];

const SIZES = [480, 960];

/** A soft-edged ellipse, used as the destination-in mask for each clone patch. */
function ellipseMask(w, h) {
  return Buffer.from(
    `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">` +
      '<defs><radialGradient id="g">' +
      '<stop offset="50%" stop-color="#fff" stop-opacity="1"/>' +
      '<stop offset="100%" stop-color="#fff" stop-opacity="0"/>' +
      '</radialGradient></defs>' +
      `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2}" ry="${h / 2}" fill="url(#g)"/>` +
      '</svg>',
  );
}

/**
 * Note the order: the source is read at full size and the result is resized
 * afterwards. Sharp runs `resize` before `composite` in a single pipeline, so
 * compositing and resizing in one chain applies the coordinates to the shrunken
 * image and lands the patches somewhere else entirely.
 */
async function buildFrame(source) {
  const base = await sharp(source).png().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = base.info;

  const layers = [];
  for (const [px, py, pw, ph] of EYES) {
    const left = Math.round((px / 100) * W);
    const top = Math.round((py / 100) * H);
    const width = Math.round((pw / 100) * W);
    const height = Math.round((ph / 100) * H);

    const patch = await sharp(base.data)
      .extract({ left, top: top + height, width, height })
      .png()
      .toBuffer();

    const soft = await sharp(patch)
      .composite([{ input: ellipseMask(width, height), blend: 'dest-in' }])
      .png()
      .toBuffer();

    layers.push({ input: soft, top, left });
  }

  return sharp(base.data).composite(layers).png().toBuffer();
}

async function main() {
  const frame = await buildFrame(SRC);

  for (const width of SIZES) {
    const out = `public/images/portrait-blink-${width}.webp`;
    const info = await sharp(frame)
      .resize({ width })
      .webp({ quality: 82 })
      .toFile(out);
    console.log(`${out} · ${info.width}×${info.height} · ${Math.round(info.size / 1024)}kB`);
  }
}

main();
