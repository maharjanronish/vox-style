// props/cards/imageTimelineCard/index.js
//
// Responsive documentary photograph card.
//
// Features:
// - Consistent dimensions across portrait and landscape
// - Automatic card height based on wrapped text
// - Maximum automatic height
// - Fixed or automatic height
// - Preloaded image assets
// - Cover / contain image fitting
// - Date, title and caption
// - Paper, shadow and tape styling
// - Standalone timeline or shared-track connector
// - Rotation-aware connector alignment
// - World-space camera movement

import {
  dropShadow,
  fitText,
  tape,
  markerStroke,
  resolveLen,
} from 'vox-studio/core/helpers.js';

const clamp = (v, min, max) =>
  Math.max(min, Math.min(max, v));

// --------------------------------------------------
// IMAGE FITTING
// --------------------------------------------------

function drawImageFit(ctx, img, iw, ih, x, y, w, h, fit = 'cover') {
  if (!img || !iw || !ih || w <= 0 || h <= 0) return;

  if (fit === 'contain') {
    const scale = Math.min(w / iw, h / ih);
    const dw = iw * scale;
    const dh = ih * scale;

    ctx.drawImage(
      img,
      x + (w - dw) / 2,
      y + (h - dh) / 2,
      dw,
      dh
    );

    return;
  }

  // Cover: crop around the image center.
  const sourceRatio = iw / ih;
  const targetRatio = w / h;

  let sx = 0;
  let sy = 0;
  let sw = iw;
  let sh = ih;

  if (sourceRatio > targetRatio) {
    sw = ih * targetRatio;
    sx = (iw - sw) / 2;
  } else {
    sh = iw / targetRatio;
    sy = (ih - sh) / 2;
  }

  ctx.drawImage(
    img,
    sx, sy, sw, sh,
    x, y, w, h
  );
}

// --------------------------------------------------
// MEASURE TEXT
// --------------------------------------------------

function measureBlock(ctx, text, {
  maxW,
  family,
  weight,
  maxSize,
  minSize,
  lineHeight,
}) {
  if (!text) {
    return {
      lines: [],
      size: maxSize,
      height: 0,
      lineHeight,
    };
  }

  return fitText(ctx, text, {
    maxW,
    maxH: 100000,
    family,
    weight,
    maxSize,
    minSize,
    lineHeight,
  });
}

// --------------------------------------------------
// DRAW FITTED TEXT
// --------------------------------------------------

function drawBlock(ctx, text, {
  x,
  y,
  maxW,
  maxH,
  family,
  weight = '400',
  maxSize = 48,
  minSize = 16,
  color = '#222',
  lineHeight = 1.15,
}) {
  if (!text || maxW <= 0 || maxH <= 0) return 0;

  const result = fitText(ctx, text, {
    maxW,
    maxH,
    family,
    weight,
    maxSize,
    minSize,
    lineHeight,
  });

  ctx.save();

  // Never let text spill outside the card.
  ctx.beginPath();
  ctx.rect(x, y, maxW, maxH);
  ctx.clip();

  ctx.font = `${weight} ${result.size}px ${family}`;
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  result.lines.forEach((line, i) => {
    ctx.fillText(
      line,
      x,
      y + i * result.size * result.lineHeight,
      maxW
    );
  });

  ctx.restore();

  return Math.min(result.height, maxH);
}

// --------------------------------------------------
// PROP
// --------------------------------------------------

export default {
  meta: {
    name: 'imageTimelineCard',
    category: 'cards',

    use: 'A documentary photograph card for presenting historical events, important discoveries, milestones or visual evidence.',

    avoid: 'Do not use for full-screen photographs, complex multi-event timelines or decorative backgrounds.',

    slots: {
      image: 'asset',
      date: 'string?',
      title: 'string?',
      caption: 'string?',
    },

    options: {
      // Position and dimensions.
      x: 'length?',
      y: 'length?',
      w: 'length?',
      h: 'length?',

      // Text-responsive sizing.
      autoHeight: 'boolean?',
      maxAutoHeight: 'length?',

      // Appearance.
      rot: 'number?',
      opacity: 'range:0..1?',

      // Image.
      imageFit: 'enum:cover|contain?',
      photoRatio: 'range:0.25..0.8?',

      // Timeline.
      timeline: 'boolean?',
      connector: 'boolean?',
      connectorGap: 'length?',
      timelineSide: 'enum:left|right?',

      // Styling.
      tape: 'boolean?',
      accent: 'color?',
      paperColor: 'color?',
    },

    defaultDuration: 4,
    enterEase: 'easeOutBack',
    space: 'world',

    example: {
      slots: {
        image: 'foxPhoto',
        date: '1997',
        title: 'A New Chapter',
        caption: 'A moment that changed the course of history.',
      },

      options: {
        x: '25%',
        y: '30%',

        // Omit w to use 39% of the shorter canvas dimension.
        // Omit h to calculate height from the text.

        autoHeight: true,
        maxAutoHeight: '82%',

        imageFit: 'cover',
        photoRatio: 0.48,

        timeline: false,
        connector: true,
        connectorSide: 'right',
        connectorGap: {
          portrait: '5.5%',
          landscape: '9%',
        },

        timelineSide: 'right',

        tape: true,
        accent: '#B45B43',
        paperColor: '#F2EBDD',
      },
    },
  },

  draw(ctx, o, env) {
    const { W, H, theme } = env;

    const orientation =
      env.orientation || (W >= H ? 'landscape' : 'portrait');

    const shortSide = Math.min(W, H);

    // ------------------------------------------------
    // 1. RESPONSIVE DIMENSIONS
    // ------------------------------------------------

    // Use the shorter canvas dimension as our design unit.
    // This keeps the card consistent across aspect ratios.

    const requestedW = Number.isFinite(o.w)
      ? o.w
      : shortSide * 0.39;

    const w = Math.min(
      requestedW,
      shortSide * 0.78
    );

    // Card width remains fixed relative to shortSide.
    // Height is calculated from actual text content.

    const pad = clamp(w * 0.055, 18, 40);

    // ------------------------------------------------
    // 2. FONT SYSTEM
    // ------------------------------------------------

    const displayFont =
      theme.fonts.display || 'sans-serif';

    const bodyFont =
      theme.fonts.body || displayFont;

    const ink = theme.colors.ink || '#292720';
    const muted = '#777166';

    const accent =
      theme.colors[o.accent] ||
      o.accent ||
      '#B45B43';

    const paper =
      theme.colors[o.paperColor] ||
      o.paperColor ||
      theme.colors.white ||
      '#F4EFE4';

    // Font sizes follow card width, not canvas width.
    const dateSize = clamp(w * 0.047, 15, 25);
    const titleSize = clamp(w * 0.072, 23, 44);
    const captionSize = clamp(w * 0.043, 15, 25);

    const dateText = o.date ?? 'UNDATED';
    const titleText = o.title ?? 'Untitled event';
    const captionText = o.caption ?? '';

    const contentW = w - pad * 2;

    // ------------------------------------------------
    // 3. MEASURE CONTENT BEFORE DRAWING
    // ------------------------------------------------

    const dateH = Math.max(28, dateSize * 1.35);

    const titleMetrics = measureBlock(ctx, titleText, {
      maxW: contentW,
      family: displayFont,
      weight: '700',
      maxSize: titleSize,
      minSize: 18,
      lineHeight: 1.12,
    });

    const captionMetrics = measureBlock(ctx, captionText, {
      maxW: contentW,
      family: bodyFont,
      weight: '400',
      maxSize: captionSize,
      minSize: 14,
      lineHeight: 1.3,
    });

    const photoGap = pad * 0.55;
    const footerGap = pad * 0.65;
    const textGap =
      titleText && captionText
        ? Math.max(7, pad * 0.3)
        : 0;

    const photoRatio = clamp(
      o.photoRatio ?? 0.48,
      0.25,
      0.8
    );

    const preferredPhotoH = w * photoRatio;

    // Natural height includes all wrapped text.
    const naturalH =
      pad * 2 +
      dateH +
      photoGap +
      preferredPhotoH +
      footerGap +
      titleMetrics.height +
      textGap +
      captionMetrics.height;

    // ------------------------------------------------
    // 4. AUTOMATIC HEIGHT / MAXIMUM HEIGHT
    // ------------------------------------------------

    const autoHeight =
      o.autoHeight ?? (o.h == null);

    const maxAutoH = o.maxAutoHeight != null
      ? resolveLen(o.maxAutoHeight, shortSide, orientation)
      : shortSide * 0.82;

    const h = autoHeight
      ? Math.min(naturalH, maxAutoH)
      : (o.h ?? naturalH);

    // If the card reaches its maximum height,
    // preserve image and text space where possible.

    const fixedWithoutPhoto =
      pad * 2 +
      dateH +
      photoGap +
      footerGap;

    const minimumTextReserve =
      (titleText ? titleMetrics.size * 1.15 : 0) +
      (captionText ? captionMetrics.size * 1.3 : 0) +
      textGap;

    const availablePhotoH =
      h - fixedWithoutPhoto - minimumTextReserve;

    const photoH = Math.max(
      80,
      Math.min(preferredPhotoH, availablePhotoH)
    );

    // ------------------------------------------------
    // 5. TEXT AREA ALLOCATION
    // ------------------------------------------------

    const textTop =
      -h / 2 +
      pad +
      dateH +
      photoGap +
      photoH +
      footerGap;

    const textBottom = h / 2 - pad;

    const textAreaH = Math.max(
      0,
      textBottom - textTop
    );

    const wantedTitleH = titleMetrics.height;
    const wantedCaptionH = captionMetrics.height;

    const wantedTextH =
      wantedTitleH +
      wantedCaptionH +
      textGap;

    let titleBudget = 0;
    let captionBudget = 0;

    if (wantedTextH <= textAreaH) {
      // Everything fits naturally.
      titleBudget = wantedTitleH;
      captionBudget = wantedCaptionH;
    } else {
      // Reduce font size when maximum card height is reached.
      const available = Math.max(
        0,
        textAreaH - textGap
      );

      const total =
        wantedTitleH + wantedCaptionH || 1;

      const titleRatio = wantedTitleH / total;

      titleBudget = titleText
        ? available * (captionText ? titleRatio : 1)
        : 0;

      captionBudget = captionText
        ? available - titleBudget
        : 0;
    }

    // ------------------------------------------------
    // 6. POSITION
    // ------------------------------------------------

    const x = o.x ?? W / 2;
    const y = o.y ?? H / 2;

    const rot = ((o.rot ?? 0) * Math.PI) / 180;

    const appear = Math.max(0, o.appear ?? 1);
    const exit = clamp(o.exit ?? 0, 0, 1);

    const alpha = Math.min(1, appear) * (1 - exit);
    const scale = 0.88 + 0.12 * Math.min(1, appear);

    ctx.save();

    ctx.globalAlpha *= alpha;

    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(scale, scale);

    // =================================================
    // 7. SHARED TIMELINE CONNECTOR
    // =================================================

    const side =
      o.timelineSide === 'right' ? 1 : -1;

    if (o.connector) {
      const rawGap = o.connectorGap;

      const gap = rawGap != null
        ? resolveLen(rawGap, W, orientation)
        : shortSide * 0.055;

      const edgeX = side * (w / 2);

      // The endpoint is anchored to the world position
      // expected by the shared timeline marker.

      const targetDX = side * (w / 2 + gap);
      const targetDY = 0;

      // Account for entrance scale and card rotation.
      const cos = Math.cos(rot);
      const sin = Math.sin(rot);

      const nodeLocalX =
        (cos * targetDX + sin * targetDY) / scale;

      const nodeLocalY =
        (-sin * targetDX + cos * targetDY) / scale;

      markerStroke(
        ctx,
        [
          { x: edgeX, y: 0 },
          { x: nodeLocalX, y: nodeLocalY },
        ],
        Math.min(1, appear),
        {
          color: accent,
          width: 5,
          wobble: 1,
          alpha: 0.95,
          rng: env.rng?.('card-connector'),
          step: 10,
        }
      );

    } else if (o.timeline !== false) {
      // Optional standalone timeline.

      const spineX = side * (w / 2 + 48);
      const edgeX = side * (w / 2);
      const markerY = -h * 0.28;

      const rng = env.rng?.('standalone-timeline');

      markerStroke(
        ctx,
        [
          { x: spineX, y: -h / 2 - 40 },
          { x: spineX, y: h / 2 + 40 },
        ],
        Math.min(1, appear),
        {
          color: accent,
          width: 5,
          wobble: 1.2,
          rng,
        }
      );

      markerStroke(
        ctx,
        [
          { x: spineX, y: markerY },
          { x: edgeX, y: markerY },
        ],
        Math.min(1, appear),
        {
          color: accent,
          width: 5,
          wobble: 1,
          rng,
        }
      );

      ctx.beginPath();
      ctx.arc(spineX, markerY, 15, 0, Math.PI * 2);
      ctx.fillStyle = paper;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(spineX, markerY, 9, 0, Math.PI * 2);
      ctx.fillStyle = accent;
      ctx.fill();
    }

    // =================================================
    // 8. PAPER BODY
    // =================================================

    dropShadow(
      ctx,
      theme,
      () => {
        ctx.fillStyle = paper;

        ctx.fillRect(
          -w / 2,
          -h / 2,
          w,
          h
        );
      },
      { lift: 1.2 }
    );

    ctx.strokeStyle = 'rgba(60,50,35,0.16)';
    ctx.lineWidth = 2;

    ctx.strokeRect(
      -w / 2,
      -h / 2,
      w,
      h
    );

    // =================================================
    // 9. DATE
    // =================================================

    const left = -w / 2 + pad;
    const top = -h / 2 + pad;

    ctx.fillStyle = accent;

    ctx.fillRect(
      left,
      top + 3,
      6,
      dateH - 6
    );

    drawBlock(ctx, dateText, {
      x: left + 18,
      y: top,
      maxW: contentW - 18,
      maxH: dateH,
      family: bodyFont,
      weight: '700',
      maxSize: dateSize,
      minSize: 14,
      color: accent,
      lineHeight: 1.15,
    });

    // =================================================
    // 10. PHOTOGRAPH
    // =================================================

    const photoX = left;
    const photoY = top + dateH + photoGap;
    const photoW = contentW;

    // Photo backing.
    ctx.fillStyle = '#D9D2C4';

    ctx.fillRect(
      photoX - 5,
      photoY - 5,
      photoW + 10,
      photoH + 10
    );

    const asset =
      o.image && env.assets
        ? env.assets.get(o.image)
        : null;

    ctx.save();

    ctx.beginPath();
    ctx.rect(photoX, photoY, photoW, photoH);
    ctx.clip();

    if (asset) {
      drawImageFit(
        ctx,
        asset.img,
        asset.w,
        asset.h,
        photoX,
        photoY,
        photoW,
        photoH,
        o.imageFit ?? 'cover'
      );
    } else {
      // Missing asset fallback.
      ctx.fillStyle = '#D9D2C4';

      ctx.fillRect(
        photoX,
        photoY,
        photoW,
        photoH
      );

      ctx.strokeStyle = '#B8AE98';
      ctx.lineWidth = 3;

      for (let i = -photoH; i < photoW; i += 35) {
        ctx.beginPath();
        ctx.moveTo(photoX + i, photoY + photoH);
        ctx.lineTo(photoX + i + photoH, photoY);
        ctx.stroke();
      }

      ctx.fillStyle = ink;
      ctx.font = `600 20px ${bodyFont}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.fillText(
        o.image ? `MISSING: ${o.image}` : 'ADD IMAGE ASSET',
        photoX + photoW / 2,
        photoY + photoH / 2,
        photoW - 20
      );
    }

    ctx.restore();

    ctx.strokeStyle = 'rgba(30,25,20,0.25)';
    ctx.lineWidth = 2;

    ctx.strokeRect(
      photoX,
      photoY,
      photoW,
      photoH
    );

    // =================================================
    // 11. TITLE
    // =================================================

    let currentY = textTop;

    const actualTitleH = drawBlock(
      ctx,
      titleText,
      {
        x: left,
        y: currentY,
        maxW: contentW,
        maxH: titleBudget,
        family: displayFont,
        weight: '700',
        maxSize: titleSize,
        minSize: 18,
        color: ink,
        lineHeight: 1.12,
      }
    );

    currentY += actualTitleH;

    // =================================================
    // 12. CAPTION
    // =================================================

    if (captionText) {
      if (titleText) currentY += textGap;

      drawBlock(
        ctx,
        captionText,
        {
          x: left,
          y: currentY,
          maxW: contentW,
          maxH: captionBudget,
          family: bodyFont,
          weight: '400',
          maxSize: captionSize,
          minSize: 14,
          color: muted,
          lineHeight: 1.3,
        }
      );
    }

    // =================================================
    // 13. PAPER TAPE
    // =================================================

    if (o.tape !== false) {
      tape(ctx, theme, {
        x: w * 0.25,
        y: -h / 2 + 5,
        w: Math.min(135, w * 0.25),
        h: 36,
        rot: -0.06,
        rng: env.rng?.('paper-tape'),
      });
    }

    ctx.restore();
  },
};
