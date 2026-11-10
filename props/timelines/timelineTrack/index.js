// props/timelines/timelineTrack/index.js
// Shared, animated documentary timeline.
//
// Supports:
// - One continuous Catmull-Rom curved path
// - Portrait and landscape point configurations
// - Animated hand-drawn line
// - Milestone markers revealed as the line reaches them
//
// Coordinates use normalized canvas units (0..1).
// Must use the same world-space depth as connected cards.

import { markerStroke } from 'vox-studio/core/helpers.js';

const clamp = (v, min, max) =>
  Math.max(min, Math.min(max, v));

// --------------------------------------------------
// SELECT POINTS FOR CURRENT ORIENTATION
// --------------------------------------------------

function selectPoints(values, orientation) {
  if (Array.isArray(values)) return values;

  if (!values || typeof values !== 'object') return [];

  if (Array.isArray(values[orientation])) {
    return values[orientation];
  }

  if (Array.isArray(values.default)) {
    return values.default;
  }

  return [];
}

// --------------------------------------------------
// NORMALIZED POINTS -> CANVAS PIXELS
// --------------------------------------------------

function readPoints(values, orientation, W, H) {
  const input = selectPoints(values, orientation);

  if (input.length < 2) return [];

  const out = [];

  for (const p of input) {
    if (
      !p ||
      !Number.isFinite(p.x) ||
      !Number.isFinite(p.y) ||
      p.x < 0 || p.x > 1 ||
      p.y < 0 || p.y > 1
    ) {
      return [];
    }

    out.push({
      x: p.x * W,
      y: p.y * H,
    });
  }

  return out;
}

// --------------------------------------------------
// CATMULL-ROM CURVE
// --------------------------------------------------

function smoothPath(points, steps = 20) {
  if (points.length < 2) return points.slice();

  const out = [];

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    for (let j = 0; j < steps; j++) {
      const t = j / steps;
      const t2 = t * t;
      const t3 = t2 * t;

      const interpolate = (a, b, c, d) =>
        0.5 * (
          2 * b +
          (-a + c) * t +
          (2 * a - 5 * b + 4 * c - d) * t2 +
          (-a + 3 * b - 3 * c + d) * t3
        );

      out.push({
        x: interpolate(p0.x, p1.x, p2.x, p3.x),
        y: interpolate(p0.y, p1.y, p2.y, p3.y),
      });
    }
  }

  out.push(points[points.length - 1]);

  return out;
}

// --------------------------------------------------
// FIND WHERE A MARKER LIES ALONG THE PATH
// --------------------------------------------------

function markerProgress(path, marker) {
  let bestIndex = 0;
  let bestDistance = Infinity;

  for (let i = 0; i < path.length; i++) {
    const dx = path[i].x - marker.x;
    const dy = path[i].y - marker.y;
    const distance = dx * dx + dy * dy;

    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }

  return bestIndex / Math.max(1, path.length - 1);
}

// --------------------------------------------------
// PROP
// --------------------------------------------------

export default {
  meta: {
    name: 'timelineTrack',
    category: 'timelines',

    use: 'One continuous documentary timeline connecting multiple photographs, historical events, documents or milestones.',

    avoid: 'Do not create separate tracks for events belonging to one chronological sequence or use as an ordinary decorative underline.',

    slots: {},

    options: {
      points: 'any',
      markers: 'any?',

      color: 'color?',
      width: 'number?',
      wobble: 'number?',

      markerRadius: 'number?',
      markerBorder: 'number?',

      smoothness: 'range:4..40?',
    },

    defaultDuration: 5,
    enterEase: 'easeOutBack',
    space: 'world',

    example: {
      slots: {},

      options: {
        points: {
          portrait: [
            { x: 0.5, y: 0.08 },
            { x: 0.5, y: 0.30 },
            { x: 0.46, y: 0.50 },
            { x: 0.5, y: 0.70 },
            { x: 0.5, y: 0.92 }
          ],
          landscape: [
            { x: 0.5, y: 0.05 },
            { x: 0.5, y: 0.25 },
            { x: 0.46, y: 0.50 },
            { x: 0.5, y: 0.75 },
            { x: 0.5, y: 0.95 }
          ]
        },

        markers: {
          portrait: [
            { x: 0.5, y: 0.30 },
            { x: 0.5, y: 0.70 }
          ],
          landscape: [
            { x: 0.5, y: 0.25 },
            { x: 0.5, y: 0.75 }
          ]
        },

        color: '#B45B43',
        width: 5,
        wobble: 2,
        markerRadius: 14,
        markerBorder: 3,
        smoothness: 20
      }
    }
  },

  draw(ctx, o, env) {
    const { W, H, theme } = env;

    const orientation =
      env.orientation || (W >= H ? 'landscape' : 'portrait');

    const points = readPoints(
      o.points,
      orientation,
      W,
      H
    );

    if (points.length < 2) return;

    const markers = o.markers
      ? readPoints(o.markers, orientation, W, H)
      : [];

    const path = smoothPath(
      points,
      Math.round(o.smoothness ?? 20)
    );

    const color =
      theme.colors[o.color] ||
      o.color ||
      '#B45B43';

    const width = Math.max(1, o.width ?? 5);
    const wobble = Math.max(0, o.wobble ?? 2);

    const radius = Math.max(2, o.markerRadius ?? 14);
    const border = Math.max(1, o.markerBorder ?? 3);

    const progress = clamp(o.appear ?? 1, 0, 1);

    // MAIN HAND-DRAWN PATH
    markerStroke(ctx, path, progress, {
      color,
      width,
      wobble,
      alpha: 0.95,
      rng: env.rng?.('timeline-track'),
      step: 10,
    });

    // MILESTONE MARKERS
    for (const p of markers) {
      const reached = markerProgress(path, p);

      if (progress + 0.002 < reached) continue;

      ctx.save();

      // Paper-colored outer circle.
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = theme.colors.paper;
      ctx.fill();

      // Colored border.
      ctx.lineWidth = border;
      ctx.strokeStyle = color;
      ctx.stroke();

      // Inner dot.
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius * 0.42, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      ctx.restore();
    }
  }
};
