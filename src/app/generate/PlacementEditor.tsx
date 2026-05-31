"use client";

/**
 * Interactive print placement editor powered by Fabric.js.
 *
 * Database requirement — run once in Supabase before saving works:
 *   ALTER TABLE designs ADD COLUMN IF NOT EXISTS placement JSONB;
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { Canvas as FabricCanvas, FabricImage as FabricImageT } from "fabric";
import { savePlacement } from "./actions";

// ── Canvas dimensions ────────────────────────────────────────────────
const W = 400;
const H = 480;

// ── Printful print zones ─────────────────────────────────────────────
// Printful front/back: 30 cm × 36 cm on a ~50 cm wide shirt.
// Scale: W / 50 cm ≈ 8 px/cm → 30 × 8 = 240 px, 36 × 8 = 288 px.
const ZONES = {
  front: { x: 80, y: 92, w: 240, h: 288 },
  back:  { x: 80, y: 80, w: 240, h: 288 },
} as const;

// ── Shirt colours ────────────────────────────────────────────────────
// CSS filters are applied to the white SVG — a lightweight way to
// preview different shirt colours without separate mockup files.
const SHIRT_COLOURS = {
  white: { label: "White", hex: "#ffffff",  filter: ""                                               },
  black: { label: "Black", hex: "#111111",  filter: "brightness(0.08)"                              },
  grey:  { label: "Grey",  hex: "#9ca3af",  filter: "brightness(0.55)"                              },
  navy:  { label: "Navy",  hex: "#1e3a5f",  filter: "brightness(0.2) saturate(3) hue-rotate(200deg)" },
} as const;

type ShirtColor = keyof typeof SHIRT_COLOURS;
type Side       = "front" | "back";

const SIZES = ["S", "M", "L", "XL", "XXL"] as const;

interface Props {
  imageUrl: string;
  designId: string;
}

export default function PlacementEditor({ imageUrl, designId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasEl     = useRef<HTMLCanvasElement>(null);
  const fabricRef       = useRef<FabricCanvas | null>(null);
  const designRef       = useRef<FabricImageT | null>(null);
  // Natural pixel width of the loaded design image. Needed to convert between
  // Fabric scaleX (fraction of natural size) and slider % (fraction of zone width).
  const imgNaturalWRef  = useRef<number>(1024);
  // Ref keeps the closure in the Fabric event handler up-to-date.
  const sideRef         = useRef<Side>("front");

  const [side,        setSide]        = useState<Side>("front");
  const [color,       setColor]       = useState<ShirtColor>("white");
  const [size,        setSize]        = useState("M");
  const [sliderScale, setSliderScale] = useState(35);
  const [outOfBounds, setOutOfBounds] = useState(false);
  const [saveStatus,  setSaveStatus]  = useState<"idle"|"saving"|"saved"|"error">("idle");

  // Keep sideRef in sync.
  useEffect(() => { sideRef.current = side; }, [side]);

  // ── One-time Fabric.js initialisation ────────────────────────────
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
      });
      fabricRef.current = canvas;

      // Fabric wraps the <canvas> in a .canvas-container div and inlines
      // dimensions on it. We position that wrapper to fill our own
      // absolutely-stacked layer, so the transparent canvas overlays the
      // shirt <img> exactly. Relying on these explicit styles (rather than
      // Fabric's defaults) is what guarantees a true W×H overlay.
      const wrapper = canvas.wrapperEl;
      if (wrapper) {
        wrapper.style.position = "absolute";
        wrapper.style.inset    = "0";
        wrapper.style.width    = `${W}px`;
        wrapper.style.height   = `${H}px`;
      }

      // The print zone is NOT drawn on the Fabric canvas — it's a pure
      // CSS <div> overlay (see render()). Fabric handles only the
      // interactive design image below.
      const z = ZONES.front;

      // ── Design image ────────────────────────────────────────────
      try {
        const img = await FabricImage.fromURL(imageUrl, { crossOrigin: "anonymous" });
        const naturalW = img.width ?? 1024;
        imgNaturalWRef.current = naturalW;
        const scale = Math.min(
          (z.w * 0.35) / naturalW,
          (z.h * 0.35) / (img.height ?? 1024),
        );
        // Slider unit: % of print-zone width. Derive from Fabric scale.
        setSliderScale(Math.round(scale * naturalW / z.w * 100));
        img.set({
          left: z.x + z.w / 2,
          top:  z.y + z.h / 2,
          originX: "center",
          originY: "center",
          scaleX: scale,
          scaleY: scale,
          // NOTE: this only affects empty canvas areas, not opaque pixels
          // already baked into the source PNG. If the generated design has
          // a solid pink/teal background, it must be exported as a
          // transparent PNG upstream — a coloured backdrop cannot be
          // stripped here client-side.
          backgroundColor:    "transparent",
          cornerColor:        "#ffffff",
          cornerStrokeColor:  "#18181b",
          cornerStyle:        "circle",
          cornerSize:         10,
          transparentCorners: false,
          name: "design",
        });
        designRef.current = img as FabricImageT;
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
      } catch {
        // Image load failed — canvas still usable.
      }

      // ── Boundary clamping ───────────────────────────────────────
      // Use delta-based correction: shift obj.left/top by the amount
      // the bounding box overflows the zone. This works regardless of
      // originX/Y setting or rotation angle.
      const checkBounds = () => {
        const obj = designRef.current;
        if (!obj || !canvas) return;

        const z = ZONES[sideRef.current];
        const b = obj.getBoundingRect();

        const overLeft   = b.left < z.x;
        const overRight  = b.left + b.width > z.x + z.w;
        const overTop    = b.top < z.y;
        const overBottom = b.top + b.height > z.y + z.h;

        const out = overLeft || overRight || overTop || overBottom;
        setOutOfBounds(out);

        if (out) {
          if (overLeft)        obj.left += z.x - b.left;
          else if (overRight)  obj.left -= (b.left + b.width) - (z.x + z.w);
          if (overTop)         obj.top  += z.y - b.top;
          else if (overBottom) obj.top  -= (b.top + b.height) - (z.y + z.h);

          obj.setCoords();
          canvas.renderAll();
        }
      };

      canvas.on("object:moving",  checkBounds);
      canvas.on("object:scaling", () => {
        checkBounds();
        const o = designRef.current;
        if (o) {
          const pct = Math.round(
            (o.scaleX ?? 1) * imgNaturalWRef.current / ZONES[sideRef.current].w * 100
          );
          setSliderScale(pct);
        }
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

  // The print zone is rendered as a CSS <div> from `side` state (see
  // render()), so no canvas redraw is needed when the side changes.

  // ── Centre design ────────────────────────────────────────────────
  const handleCenter = useCallback(() => {
    const canvas = fabricRef.current;
    const obj    = designRef.current;
    if (!canvas || !obj) return;
    const z = ZONES[side];
    obj.set({ left: z.x + z.w / 2, top: z.y + z.h / 2, originX: "center", originY: "center" });
    canvas.renderAll();
    setOutOfBounds(false);
  }, [side]);

  // ── Scale slider ────────────────────────────────────────────────
  function handleScaleChange(pct: number) {
    const canvas = fabricRef.current;
    const obj    = designRef.current;
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
      b.left + b.width  > z.x + z.w ||
      b.top  < z.y ||
      b.top  + b.height > z.y + z.h
    );
  }

  // ── Save placement ───────────────────────────────────────────────
  const handleSave = async () => {
    const obj = designRef.current;
    if (!obj) return;
    setSaveStatus("saving");

    const result = await savePlacement(designId, {
      side,
      x:          Math.round(obj.left),
      y:          Math.round(obj.top),
      scale:      Math.round((obj.scaleX ?? 1) * 100) / 100,
      rotation:   Math.round((obj.angle  ?? 0)),
      shirtColor: color,
      size,
    });

    if (result.error) {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } else {
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 4000);
    }
  };

  // ── Render ───────────────────────────────────────────────────────
  return (
    <section className="mt-12 border-t border-zinc-100 pt-12 dark:border-zinc-800">
      <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
        Place on shirt
      </h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Drag, resize, and rotate your design. The dashed border marks the Printful print zone.
      </p>

      {/* Front / Back toggle */}
      <div className="mt-5 flex gap-2">
        {(["front", "back"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSide(s)}
            className={`rounded-full border px-5 py-1.5 text-sm font-medium capitalize transition-colors ${
              side === s
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                : "border-zinc-200 text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start">
        {/* ── Canvas ──────────────────────────────────────────── */}
        <div
          ref={containerRef}
          className="relative mx-auto shrink-0 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900"
          style={{ width: W, height: H }}
        >
          {/* Layer 1 — shirt mockup. The SVG viewBox is 400×400 and the
              print-zone coordinates are authored in that same space, so the
              image is pinned top-left at the canvas width (no centering /
              letterboxing) to keep a 1:1 mapping with the Fabric canvas. */}
          <img
            src="/mockups/tshirt-white.svg"
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

          {/* Layer 2 — print-zone border. Pure HTML/CSS so it always
              renders, independent of Fabric/Turbopack canvas timing.
              Position/size are driven directly by ZONES[side]. */}
          <div
            aria-hidden
            className="pointer-events-none absolute rounded-sm"
            style={{
              left:   ZONES[side].x,
              top:    ZONES[side].y,
              width:  ZONES[side].w,
              height: ZONES[side].h,
              border: "2px dashed rgba(220,38,38,0.6)",
              backgroundColor: "rgba(220,38,38,0.04)",
            }}
          />

          {/* Layer 3 — transparent Fabric canvas, stacked above the shirt.
              Fabric's wrapper div is positioned absolute/inset-0 in init(). */}
          <div className="absolute inset-0">
            <canvas ref={canvasEl} className="touch-none" />
          </div>
        </div>

        {/* ── Controls ────────────────────────────────────────── */}
        <div className="flex w-full flex-col gap-6 lg:max-w-[220px]">
          {/* Shirt colour */}
          <div>
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              Shirt colour
            </p>
            <div className="flex flex-wrap gap-3">
              {(Object.keys(SHIRT_COLOURS) as ShirtColor[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  title={SHIRT_COLOURS[c].label}
                  aria-label={SHIRT_COLOURS[c].label}
                  className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${
                    color === c
                      ? "scale-110 border-zinc-900 shadow dark:border-white"
                      : "border-zinc-300 dark:border-zinc-600"
                  }`}
                  style={{ backgroundColor: SHIRT_COLOURS[c].hex }}
                />
              ))}
            </div>
          </div>

          {/* Design size slider */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                Size
              </p>
              <span className="text-xs tabular-nums text-zinc-400 dark:text-zinc-500">
                {sliderScale}%
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={100}
              step={1}
              value={sliderScale}
              onChange={(e) => handleScaleChange(Number(e.target.value))}
              className="w-full accent-zinc-900 dark:accent-white"
            />
          </div>

          {/* Garment size */}
          <div>
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              Garment
            </p>
            <div className="flex flex-wrap gap-2">
              {SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    size === s
                      ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                      : "border-zinc-200 text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
                  }`}
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
            className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
          >
            Center design
          </button>

          {/* Out-of-bounds toast */}
          {outOfBounds && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/50 dark:text-amber-400">
              Snapped — design was outside the print zone.
            </div>
          )}

          {/* Save */}
          <div className="mt-auto flex flex-col gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saveStatus === "saving"}
              className="w-full rounded-full bg-zinc-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
            >
              {saveStatus === "saving"
                ? "Saving…"
                : saveStatus === "saved"
                ? "Placement saved ✓"
                : "Save placement"}
            </button>

            {saveStatus === "error" && (
              <p className="text-center text-xs text-red-500">
                Couldn&apos;t save. Make sure you&apos;re signed in and the
                database has a <code className="font-mono">placement</code>{" "}
                column.
              </p>
            )}
            {saveStatus === "saved" && (
              <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                Saved. Adjust and save again anytime.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
