"use client";

/**
 * Interactive print placement editor powered by Fabric.js.
 *
 * Drag / resize (aspect-ratio locked) / rotate an AI design within the print
 * zone, pick a shirt colour and garment size, and save the placement to
 * Supabase. Works with mouse and touch (drag, pinch-to-zoom, two-finger
 * rotate).
 *
 * Print-zone geometry, the mockup and colours all come from `./printful` —
 * that file is the Printful coupling point (see its header).
 *
 * Database requirement — run the migration in
 * `supabase/migrations/0001_design_placement.sql` once before saving works.
 */

import { useCallback, useEffect, useRef, useState } from "react";
// ResizeObserver is available in all modern browsers. No polyfill needed.
import type { Canvas as FabricCanvas, FabricImage as FabricImageT } from "fabric";
import { savePlacement, type PlacementData } from "./actions";
import {
  CANVAS_W as W,
  CANVAS_H as H,
  ZONES,
  MOCKUP,
  SHIRT_COLOURS,
  SIZES,
  type Side,
  type ShirtColor,
} from "./printful";

interface Props {
  imageUrl: string;
  designId: string;
  /**
   * Previously saved placement to restore on mount. When present, the editor
   * loads the design at the saved position/scale/rotation and pre-selects the
   * saved shirt colour, side and garment size instead of starting from a
   * centred default. Written by `savePlacement` (see actions.ts).
   */
  initialPlacement?: PlacementData | null;
}

// Coerce a stored shirt-colour string back to a known ShirtColor, falling back
// to "white" if the value is no longer a valid option.
function asShirtColor(value: string | undefined): ShirtColor {
  return value && value in SHIRT_COLOURS ? (value as ShirtColor) : "white";
}

// Coerce a stored side string back to a known Side, defaulting to "front".
function asSide(value: string | undefined): Side {
  return value && value in ZONES ? (value as Side) : "front";
}

export default function PlacementEditor({ imageUrl, designId, initialPlacement = null }: Props) {
  const canvasEl = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  const designRef = useRef<FabricImageT | null>(null);
  // Natural pixel width of the loaded design image. Needed to convert between
  // Fabric scaleX (fraction of natural size) and slider % (fraction of zone width).
  const imgNaturalWRef = useRef<number>(1024);
  // Ref keeps the closure in the Fabric event handlers up-to-date.
  const sideRef = useRef<Side>(asSide(initialPlacement?.side));
  // Ref keeps the saved placement reachable inside the one-time init closure
  // without re-running it (init only depends on imageUrl).
  const initialPlacementRef = useRef<PlacementData | null>(initialPlacement);

  const [side, setSide] = useState<Side>(asSide(initialPlacement?.side));
  const [color, setColor] = useState<ShirtColor>(asShirtColor(initialPlacement?.shirtColor));
  const [size, setSize] = useState(initialPlacement?.size ?? "M");
  const [sliderScale, setSliderScale] = useState(35);
  const [outOfBounds, setOutOfBounds] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // ── Responsive scaling ────────────────────────────────────────────────────
  // The Fabric canvas is always initialised at W×H (400×480) in logical pixels.
  // On narrow screens we CSS-scale the wrapper div down so it fits within the
  // viewport. Fabric v7 corrects pointer/touch coordinates automatically by
  // comparing upperCanvasEl.width with getBoundingClientRect().width.
  // The saved placement coordinates (x, y, scale) remain in 400×480 space —
  // the displayScale only affects the on-screen rendering, not the data.
  const outerRef = useRef<HTMLDivElement>(null);
  const [displayScale, setDisplayScale] = useState(1);

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const available = entry.contentRect.width;
      // Never upscale (max 1); shrink when container is narrower than W.
      setDisplayScale(Math.min(1, available / W));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Keep sideRef in sync.
  useEffect(() => {
    sideRef.current = side;
  }, [side]);

  // ── One-time Fabric.js initialisation ──────────────────────────────────────
  useEffect(() => {
    if (!canvasEl.current) return;
    let canvas: FabricCanvas | null = null;

    const init = async () => {
      const { Canvas, FabricImage } = await import("fabric");
      if (!canvasEl.current) return;

      canvas = new Canvas(canvasEl.current, {
        width: W,
        height: H,
        selection: false,
        backgroundColor: "transparent",
        // ── Mobile touch support ───────────────────────────────────────────
        // Fabric handles single-finger drag and two-finger pinch-zoom /
        // rotate natively on the active object once touch events reach the
        // canvas. We must NOT let the browser scroll/zoom the page while the
        // user manipulates the design, so touch scrolling is disabled on the
        // canvas (the wrapper also gets `touch-action: none`).
        allowTouchScrolling: false,
        // ── Aspect-ratio lock ──────────────────────────────────────────────
        // Fabric scales uniformly by default; setting uniScaleKey to null
        // removes the modifier key that would otherwise let the user break the
        // aspect ratio, so corner-handle resizes ALWAYS keep proportions.
        uniformScaling: true,
        uniScaleKey: null,
      });
      fabricRef.current = canvas;

      // Fabric wraps the <canvas> in a .canvas-container div and inlines
      // dimensions on it. We position that wrapper to fill our own
      // absolutely-stacked layer so the transparent canvas overlays the shirt
      // <img> exactly, and force `touch-action: none` so the browser never
      // hijacks touch gestures meant for the design.
      const wrapper = canvas.wrapperEl;
      if (wrapper) {
        wrapper.style.position = "absolute";
        wrapper.style.inset = "0";
        wrapper.style.width = `${W}px`;
        wrapper.style.height = `${H}px`;
        wrapper.style.touchAction = "none";
      }
      const upper = canvas.upperCanvasEl;
      if (upper) upper.style.touchAction = "none";

      const saved = initialPlacementRef.current;
      const z = ZONES[asSide(saved?.side)];

      // ── Design image ─────────────────────────────────────────────────────
      try {
        const img = await FabricImage.fromURL(imageUrl, { crossOrigin: "anonymous" });
        const naturalW = img.width ?? 1024;
        imgNaturalWRef.current = naturalW;
        // Restore the saved scale/position/rotation when available; otherwise
        // fall back to a centred, 35%-of-zone default.
        const defaultScale = Math.min(
          (z.w * 0.35) / naturalW,
          (z.h * 0.35) / (img.height ?? 1024),
        );
        const scale = saved ? saved.scale : defaultScale;
        setSliderScale(Math.round((scale * naturalW) / z.w * 100));
        img.set({
          left: saved ? saved.x : z.x + z.w / 2,
          top: saved ? saved.y : z.y + z.h / 2,
          angle: saved ? saved.rotation : 0,
          originX: "center",
          originY: "center",
          scaleX: scale,
          scaleY: scale,
          // Touch targets: bigger, rounded sticker-style handles read well on
          // mobile and match the brand.
          cornerColor: "var(--paper, #f5f0e1)",
          cornerStrokeColor: "var(--ink, #1a1a1a)",
          cornerStyle: "circle",
          cornerSize: 16,
          touchCornerSize: 28,
          transparentCorners: false,
          borderColor: "var(--ink, #1a1a1a)",
          name: "design",
        });
        // Hide the non-corner handles (enforces corner-only, aspect-locked resize).
        img.setControlsVisibility({ mt: false, mb: false, ml: false, mr: false });
        designRef.current = img as FabricImageT;
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
      } catch {
        // Image load failed — canvas still usable.
      }

      // ── Boundary clamping ──────────────────────────────────────────────────
      // Delta-based correction: shift obj.left/top by the amount the bounding
      // box overflows the zone. Works regardless of origin or rotation.
      const checkBounds = () => {
        const obj = designRef.current;
        if (!obj || !canvas) return;

        const z = ZONES[sideRef.current];
        const b = obj.getBoundingRect();

        const overLeft = b.left < z.x;
        const overRight = b.left + b.width > z.x + z.w;
        const overTop = b.top < z.y;
        const overBottom = b.top + b.height > z.y + z.h;

        const out = overLeft || overRight || overTop || overBottom;
        setOutOfBounds(out);

        if (out) {
          if (overLeft) obj.left += z.x - b.left;
          else if (overRight) obj.left -= b.left + b.width - (z.x + z.w);
          if (overTop) obj.top += z.y - b.top;
          else if (overBottom) obj.top -= b.top + b.height - (z.y + z.h);

          obj.setCoords();
          canvas.renderAll();
        }
      };

      const syncSliderFromObject = () => {
        const o = designRef.current;
        if (!o) return;
        const pct = Math.round(
          ((o.scaleX ?? 1) * imgNaturalWRef.current) / ZONES[sideRef.current].w * 100,
        );
        setSliderScale(pct);
      };

      canvas.on("object:moving", checkBounds);
      canvas.on("object:scaling", () => {
        checkBounds();
        syncSliderFromObject();
      });
      // Touch pinch-zoom/rotate fire object:modified rather than the granular
      // events on some devices, so clamp + sync there too.
      canvas.on("object:modified", () => {
        checkBounds();
        syncSliderFromObject();
      });
      canvas.on("object:rotating", () => setOutOfBounds(false));
    };

    init();

    return () => {
      canvas?.dispose();
      fabricRef.current = null;
      designRef.current = null;
    };
  }, [imageUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Centre design ────────────────────────────────────────────────────────
  const handleCenter = useCallback(() => {
    const canvas = fabricRef.current;
    const obj = designRef.current;
    if (!canvas || !obj) return;
    const z = ZONES[side];
    obj.set({ left: z.x + z.w / 2, top: z.y + z.h / 2, originX: "center", originY: "center" });
    obj.setCoords();
    canvas.renderAll();
    setOutOfBounds(false);
  }, [side]);

  // ── Scale slider ──────────────────────────────────────────────────────────
  function handleScaleChange(pct: number) {
    const canvas = fabricRef.current;
    const obj = designRef.current;
    if (!canvas || !obj) return;
    setSliderScale(pct);
    // Convert slider % (fraction of zone width) → Fabric scale (fraction of natural size).
    const fabricScale = (pct / 100) * (ZONES[sideRef.current].w / imgNaturalWRef.current);
    obj.set({ scaleX: fabricScale, scaleY: fabricScale });
    obj.setCoords();
    canvas.renderAll();
    const z = ZONES[sideRef.current];
    const b = obj.getBoundingRect();
    setOutOfBounds(
      b.left < z.x ||
        b.left + b.width > z.x + z.w ||
        b.top < z.y ||
        b.top + b.height > z.y + z.h,
    );
  }

  // ── Save placement ──────────────────────────────────────────────────────
  const handleSave = async () => {
    const obj = designRef.current;
    if (!obj) return;
    setSaveStatus("saving");

    const result = await savePlacement(designId, {
      side,
      x: Math.round(obj.left),
      y: Math.round(obj.top),
      scale: Math.round((obj.scaleX ?? 1) * 1000) / 1000,
      widthFraction: Math.round(((obj.scaleX ?? 1) * imgNaturalWRef.current / ZONES[sideRef.current].w) * 1000) / 1000,
      rotation: Math.round(obj.angle ?? 0),
      shirtColor: color,
      size,
      canvasW: W,
      canvasH: H,
    });

    if (result.error) {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } else {
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 4000);
    }
  };

  // ── Shared sticker pill styles ────────────────────────────────────────────
  const pill = (active: boolean) =>
    `rounded-full border-2 border-ink px-4 py-1.5 text-sm font-extrabold transition-transform ${
      active
        ? "bg-ink text-paper shadow-[2px_2px_0_0_var(--ink)]"
        : "bg-paper text-ink hover:-translate-y-0.5 hover:shadow-[2px_2px_0_0_var(--ink)]"
    }`;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    // NOTE: touch-action:none must NOT be on the whole section — that would
    // block page scrolling on mobile. It is applied only on the canvas wrapper
    // (outerRef div) and the canvas element itself below.
    <section
      className="mt-12 border-t-2 border-dashed border-ink/30 pt-10"
    >
      <div className="flex items-center gap-3">
        <span className="font-marker text-2xl text-brand-orange">✶</span>
        <h2 className="font-display text-2xl text-ink">Place it on the shirt</h2>
      </div>
      <p className="mt-2 font-hand text-lg text-ink/70">
        Drag, pinch to resize, twist to rotate. Keep it inside the dashed print zone.
      </p>

      {/* Front / Back toggle */}
      <div className="mt-5 flex gap-2">
        {(Object.keys(ZONES) as Side[]).map((s) => (
          <button key={s} type="button" onClick={() => setSide(s)} className={`${pill(side === s)} capitalize`}>
            {s}
          </button>
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start">
        {/* ── Canvas — responsive wrapper ──────────────────────────────────── */}
        {/*
          outerRef measures available width via ResizeObserver.
          The outer div is sized to W*displayScale × H*displayScale so it
          takes up exactly the right amount of space in the flow.
          The inner canvas div is the real W×H and is CSS-scaled down.
          Fabric always works in 400×480 logical pixels; saved coordinates
          are unaffected. Pointer correction is automatic in Fabric v7 via
          upperCanvasEl.width / getBoundingClientRect().width.
          touch-action:none is scoped to this wrapper so page scroll outside
          the canvas is unaffected on mobile.
        */}
        <div ref={outerRef} className="w-full shrink-0 touch-none lg:w-auto">
          <div
            className="mx-auto overflow-hidden"
            style={{
              width: Math.round(W * displayScale),
              height: Math.round(H * displayScale),
            }}
          >
            <div
              className="ink-card relative touch-none overflow-hidden rounded-2xl bg-paper-2"
              style={{
                width: W,
                height: H,
                transformOrigin: "top left",
                transform: displayScale < 1 ? `scale(${displayScale})` : undefined,
              }}
            >
              {/* Layer 1 — shirt mockup, pinned top-left for a 1:1 map with the
                  Fabric canvas. PRINTFUL: swap MOCKUP.src for a real mockup. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={MOCKUP.src}
                alt=""
                aria-hidden
                draggable={false}
                className="pointer-events-none absolute left-0 top-0 select-none"
                style={{
                  width: W,
                  height: W, // SVG is square (400×400)
                  filter: color !== "white" ? SHIRT_COLOURS[color].filter : undefined,
                }}
              />

              {/* Layer 2 — print-zone border. Pure CSS so it always renders,
                  independent of Fabric timing. Driven by ZONES[side]. */}
              <div
                aria-hidden
                className="pointer-events-none absolute rounded-md"
                style={{
                  left: ZONES[side].x,
                  top: ZONES[side].y,
                  width: ZONES[side].w,
                  height: ZONES[side].h,
                  border: "2px dashed var(--ink)",
                  backgroundColor: "rgba(245,197,24,0.10)",
                }}
              />

              {/* Layer 3 — transparent Fabric canvas above the shirt. */}
              <div className="absolute inset-0">
                <canvas ref={canvasEl} className="touch-none" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Controls ──────────────────────────────────────────────────────── */}
        <div className="flex w-full flex-col gap-6 lg:max-w-[230px]">
          {/* Shirt colour */}
          <div>
            <p className="mb-3 font-marker text-sm text-ink/70">Shirt colour</p>
            <div className="flex flex-wrap gap-3">
              {(Object.keys(SHIRT_COLOURS) as ShirtColor[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  title={SHIRT_COLOURS[c].label}
                  aria-label={SHIRT_COLOURS[c].label}
                  className={`h-11 w-11 rounded-full border-2 border-ink transition-transform hover:-translate-y-0.5 ${
                    color === c ? "shadow-[2px_2px_0_0_var(--ink)]" : ""
                  }`}
                  style={{ backgroundColor: SHIRT_COLOURS[c].hex }}
                />
              ))}
            </div>
          </div>

          {/* Design size slider */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="font-marker text-sm text-ink/70">Print size</p>
              <span className="font-hand text-lg tabular-nums text-ink/70">{sliderScale}%</span>
            </div>
            <input
              type="range"
              min={5}
              max={100}
              step={1}
              value={sliderScale}
              onChange={(e) => handleScaleChange(Number(e.target.value))}
              className="w-full accent-brand-blue h-2 cursor-pointer"
            />
          </div>

          {/* Garment size */}
          <div>
            <p className="mb-3 font-marker text-sm text-ink/70">Garment</p>
            <div className="flex flex-wrap gap-2">
              {SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  className={`${pill(size === s)} min-h-[44px] px-3 py-2 text-xs`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Centre button */}
          <button
            type="button"
            onClick={handleCenter}
            className="sticker-sm min-h-[44px] rounded-full bg-paper px-4 py-2.5 text-sm font-extrabold text-ink"
          >
            Center design
          </button>

          {/* Out-of-bounds toast */}
          {outOfBounds && (
            <div className="rounded-lg border-2 border-ink bg-brand-yellow/30 px-3 py-2 text-xs font-bold text-ink">
              Snapped back — that was outside the print zone.
            </div>
          )}

          {/* Save */}
          <div className="mt-auto flex flex-col gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saveStatus === "saving"}
              className="sticker w-full min-h-[48px] rounded-full bg-brand-green py-3 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saveStatus === "saving"
                ? "Saving…"
                : saveStatus === "saved"
                ? "Placement saved ✓"
                : "Save placement"}
            </button>

            {saveStatus === "error" && (
              <p className="text-center text-xs font-bold text-brand-orange">
                Couldn&apos;t save. Make sure you&apos;re signed in and the database has a{" "}
                <code className="font-mono">placement</code> column.
              </p>
            )}
            {saveStatus === "saved" && (
              <p className="text-center font-hand text-base text-ink/70">
                Saved. Adjust and save again anytime.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
