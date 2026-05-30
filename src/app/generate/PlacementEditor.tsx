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
  const fabricRef    = useRef<FabricCanvas | null>(null);
  const designRef    = useRef<FabricImageT | null>(null);
  // Ref keeps the closure in the Fabric event handler up-to-date.
  const sideRef      = useRef<Side>("front");

  const [side,        setSide]        = useState<Side>("front");
  const [color,       setColor]       = useState<ShirtColor>("white");
  const [size,        setSize]        = useState("M");
  const [outOfBounds, setOutOfBounds] = useState(false);
  const [saveStatus,  setSaveStatus]  = useState<"idle"|"saving"|"saved"|"error">("idle");

  // Keep sideRef in sync.
  useEffect(() => { sideRef.current = side; }, [side]);

  // ── One-time Fabric.js initialisation ────────────────────────────
  useEffect(() => {
    if (!canvasEl.current) return;
    let canvas: FabricCanvas | null = null;

    const init = async () => {
      const { Canvas, FabricImage, Rect } = await import("fabric");
      if (!canvasEl.current) return;

      canvas = new Canvas(canvasEl.current, {
        width: W,
        height: H,
        selection: false,
        backgroundColor: "",
      });
      fabricRef.current = canvas;

      // Position Fabric's wrapper div so it overlays the shirt <img>.
      const wrapper = canvas.wrapperEl;
      if (wrapper) {
        wrapper.style.position = "absolute";
        wrapper.style.top      = "0";
        wrapper.style.left     = "0";
      }

      // ── Print-zone overlay ──────────────────────────────────────
      const z = ZONES.front;
      const printZone = new Rect({
        left: z.x, top: z.y, width: z.w, height: z.h,
        fill: "rgba(220,38,38,0.04)",
        stroke: "rgba(220,38,38,0.55)",
        strokeWidth: 1.5,
        strokeDashArray: [7, 4],
        selectable: false, evented: false,
        name: "printZone",
      });
      canvas.add(printZone);

      // ── Design image ────────────────────────────────────────────
      try {
        const img = await FabricImage.fromURL(imageUrl, { crossOrigin: "anonymous" });
        const scale = Math.min(
          (z.w * 0.6) / (img.width  ?? 100),
          (z.h * 0.6) / (img.height ?? 100),
        );
        img.set({
          left: z.x + z.w / 2,
          top:  z.y + z.h / 2,
          originX: "center",
          originY: "center",
          scaleX: scale,
          scaleY: scale,
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
      const checkBounds = () => {
        const obj = designRef.current;
        if (!obj || !canvas) return;

        const z = ZONES[sideRef.current];
        const b = obj.getBoundingRect();

        const out =
          b.left              < z.x      ||
          b.top               < z.y      ||
          b.left + b.width    > z.x + z.w ||
          b.top  + b.height   > z.y + z.h;

        setOutOfBounds(out);

        if (out) {
          const nl = Math.max(z.x + b.width  / 2, Math.min(z.x + z.w - b.width  / 2, obj.left));
          const nt = Math.max(z.y + b.height / 2, Math.min(z.y + z.h - b.height / 2, obj.top));
          obj.set({ left: nl, top: nt });
          canvas.renderAll();
        }
      };

      canvas.on("object:moving",  checkBounds);
      canvas.on("object:scaling", checkBounds);
      canvas.on("object:rotating", () => setOutOfBounds(false));
    };

    init();

    return () => {
      canvas?.dispose();
      fabricRef.current = null;
      designRef.current = null;
    };
  }, [imageUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Redraw print-zone when side changes ──────────────────────────
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    // Remove old zone.
    const old = canvas.getObjects().find((o) => (o as any).name === "printZone");
    if (old) canvas.remove(old);

    import("fabric").then(({ Rect }) => {
      const z = ZONES[side];
      const printZone = new Rect({
        left: z.x, top: z.y, width: z.w, height: z.h,
        fill: "rgba(220,38,38,0.04)",
        stroke: "rgba(220,38,38,0.55)",
        strokeWidth: 1.5,
        strokeDashArray: [7, 4],
        selectable: false, evented: false,
        name: "printZone",
      });
      canvas.add(printZone);
      canvas.sendObjectToBack(printZone);
      canvas.renderAll();
    });
  }, [side]);

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
          className="relative mx-auto shrink-0 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800"
          style={{ width: W, height: H }}
        >
          {/* White shirt SVG — CSS filter tints it for other colours. */}
          <img
            src="/mockups/tshirt-white.svg"
            alt=""
            aria-hidden
            draggable={false}
            className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain"
            style={color !== "white" ? { filter: SHIRT_COLOURS[color].filter } : undefined}
          />

          {/* Fabric.js canvas — Fabric wraps this in a div and positions it. */}
          <canvas ref={canvasEl} className="touch-none" />
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

          {/* Size */}
          <div>
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              Size
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
