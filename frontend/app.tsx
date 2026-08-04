import { ChevronDown, Download, Plus, RotateCcw, Trash2, X } from "lucide-react";
import opentype, { type Font } from "opentype.js";
import { type ChangeEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { generateSvg } from "../lib/generate-svg";
import { defaultLineColours } from "../lib/get-station-details";
import type { LineColourOverrides } from "../lib/types";

interface FontChoice {
  id: string;
  label: string;
  url?: string;
  weights: readonly number[];
}

interface CustomFont {
  font: Font;
  label: string;
}

interface ColourRow {
  bg: string;
  code: string;
  fg: string;
  id: string;
  isFallback: boolean;
}

const WEIGHTS_100_TO_900 = [100, 200, 300, 400, 500, 600, 700, 800, 900] as const;
const WEIGHTS_200_TO_900 = [200, 300, 400, 500, 600, 700, 800, 900] as const;
const WEIGHTS_300_TO_900 = [300, 400, 500, 600, 700, 800, 900] as const;

// Requested Fontsource sans-serif families plus LTA Identity, presented alphabetically.
const FONT_CHOICES: FontChoice[] = [
  { id: "carlito", label: "Carlito", weights: [400, 700] },
  { id: "dm-sans", label: "DM Sans", weights: WEIGHTS_100_TO_900 },
  { id: "figtree", label: "Figtree", weights: WEIGHTS_300_TO_900 },
  { id: "geist", label: "Geist", weights: WEIGHTS_100_TO_900 },
  {
    id: "ibm-plex-sans",
    label: "IBM Plex Sans",
    weights: [100, 200, 300, 400, 500, 600, 700],
  },
  { id: "inter", label: "Inter", weights: WEIGHTS_100_TO_900 },
  { id: "lato", label: "Lato", weights: [100, 300, 400, 700, 900] },
  {
    id: "lta-identity",
    label: "LTA Identity",
    url: "/fonts/LTAIdentity.ttf",
    weights: [500],
  },
  {
    id: "manrope",
    label: "Manrope",
    weights: [200, 300, 400, 500, 600, 700, 800],
  },
  { id: "montserrat", label: "Montserrat", weights: WEIGHTS_100_TO_900 },
  { id: "noto-sans", label: "Noto Sans", weights: WEIGHTS_100_TO_900 },
  { id: "nunito", label: "Nunito", weights: WEIGHTS_200_TO_900 },
  {
    id: "open-sans",
    label: "Open Sans",
    weights: [300, 400, 500, 600, 700, 800],
  },
  { id: "outfit", label: "Outfit", weights: WEIGHTS_100_TO_900 },
  { id: "poppins", label: "Poppins", weights: WEIGHTS_100_TO_900 },
  { id: "public-sans", label: "Public Sans", weights: WEIGHTS_100_TO_900 },
  { id: "roboto", label: "Roboto", weights: WEIGHTS_100_TO_900 },
  {
    id: "space-grotesk",
    label: "Space Grotesk",
    weights: [300, 400, 500, 600, 700],
  },
];

const FONT_WEIGHT_LABELS: Record<number, string> = {
  100: "Thin",
  200: "Extra Light",
  300: "Light",
  400: "Regular",
  500: "Medium",
  600: "Semi Bold",
  700: "Bold",
  800: "Extra Bold",
  900: "Black",
};

const EXAMPLES = ["CC32", "TE14:NS22", "NS21-DT11", "EW4:CG"];
const PNG_HEIGHT_PRESETS = [64, 128, 256, 384, 512] as const;
const HEX_COLOUR = /^#[\da-f]{6}$/i;
const STATION_CODE =
  /^(?:[A-Z]+\d*[A-Z]?|\{[A-Z]+\d*[A-Z]?\})(?:(?::|-)(?:[A-Z]+\d*[A-Z]?|\{[A-Z]+\d*[A-Z]?\}))*$/;
const fontCache = new Map<string, Font>();
let rowSequence = 0;

function nextRowId(code: string) {
  rowSequence += 1;
  return `${code}-${rowSequence}`;
}

function createDefaultColourRows(): ColourRow[] {
  const lineRows = Object.entries(defaultLineColours)
    .filter(([code]) => code !== "default")
    .map(([code, colour]) => ({
      bg: colour.bg,
      code,
      fg: colour.fg === "white" ? "#FFFFFF" : colour.fg,
      id: nextRowId(code),
      isFallback: false,
    }));
  const fallback = defaultLineColours.default;

  return [
    ...lineRows,
    {
      bg: fallback.bg,
      code: "",
      fg: fallback.fg === "white" ? "#FFFFFF" : fallback.fg,
      id: nextRowId("fallback"),
      isFallback: true,
    },
  ];
}

function normaliseHex(value: string) {
  const trimmed = value.trim();
  return HEX_COLOUR.test(trimmed) ? trimmed.toUpperCase() : null;
}

function getSafeColour(value: string, fallback: string) {
  return normaliseHex(value) ?? fallback;
}

function getFontUrl(fontChoice: FontChoice, weight: number) {
  return (
    fontChoice.url ??
    `https://cdn.jsdelivr.net/fontsource/fonts/${fontChoice.id}@latest/latin-${weight}-normal.woff`
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

function getExportName(stationCode: string) {
  const safeCode = stationCode
    .trim()
    .replace(/[{}]/g, "")
    .replace(/[^a-z0-9:-]+/gi, "-")
    .replace(/^-+|-+$/g, "");
  return safeCode || "mrt-badge";
}

function SliderField({
  description,
  label,
  max,
  min,
  onChange,
  suffix,
  value,
}: {
  description?: string;
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  suffix: string;
  value: number;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-4">
        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</span>
        <output className="font-mono text-xs font-medium text-neutral-500 dark:text-neutral-400">
          {value}
          {suffix}
        </output>
      </span>
      <input
        className="range-control mt-3 block w-full"
        max={max}
        min={min}
        onChange={event => onChange(Number(event.currentTarget.value))}
        type="range"
        value={value}
      />
      {description ? (
        <span className="mt-2 block text-xs leading-5 text-neutral-500 dark:text-neutral-400">
          {description}
        </span>
      ) : null}
    </label>
  );
}

function DownloadButton({
  children,
  disabled,
  onClick,
  primary = false,
}: {
  children: ReactNode;
  disabled: boolean;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      className={
        primary
          ? "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-neutral-950 px-4 text-sm font-semibold text-white hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 disabled:opacity-45 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100 dark:focus-visible:outline-white"
          : "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-950 hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 disabled:opacity-45 dark:border-transparent dark:bg-neutral-700 dark:text-white dark:hover:bg-neutral-600 dark:focus-visible:outline-white"
      }
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <Download aria-hidden="true" size={16} strokeWidth={2.2} />
      {children}
    </button>
  );
}

function PngDownloadPopover({
  disabled,
  onSelect,
}: {
  disabled: boolean;
  onSelect: (height: number) => Promise<void>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-950 hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 disabled:opacity-45 dark:border-transparent dark:bg-neutral-700 dark:text-white dark:hover:bg-neutral-600 dark:focus-visible:outline-white sm:w-auto"
        disabled={disabled}
        onClick={() => setOpen(current => !current)}
        ref={triggerRef}
        type="button"
      >
        <Download aria-hidden="true" size={16} strokeWidth={2.2} />
        Download PNG
        <ChevronDown
          aria-hidden="true"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
          size={15}
        />
      </button>

      {open ? (
        <div
          aria-label="Choose PNG badge height"
          className="absolute left-0 top-full z-20 mt-2 w-44 rounded-lg border border-neutral-200 bg-white p-2 text-neutral-800 shadow-xl dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 sm:left-auto sm:right-0"
          role="dialog"
        >
          <div className="grid gap-1">
            {PNG_HEIGHT_PRESETS.map(height => (
              <button
                className="min-h-10 rounded-md px-3 text-left text-sm font-semibold hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-neutral-900 dark:hover:bg-neutral-700 dark:focus-visible:outline-neutral-100"
                key={height}
                onClick={() => {
                  setOpen(false);
                  void onSelect(height);
                }}
                type="button"
              >
                {height}px height
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function LineBadgePreview({
  bg,
  border,
  code,
  fg,
  font,
  fontSize,
}: {
  bg: string;
  border: number;
  code: string;
  fg: string;
  font: Font | null;
  fontSize: number;
}) {
  const [previewSvg, setPreviewSvg] = useState("");

  useEffect(() => {
    const previewLineCode = /^[A-Z]+/.exec(code)?.[0];
    if (!font || !code || !previewLineCode) {
      setPreviewSvg("");
      return;
    }

    let cancelled = false;
    const safeBg = getSafeColour(bg, defaultLineColours.default.bg);
    const safeFg = getSafeColour(fg, "#FFFFFF");

    generateSvg(code, {
      border,
      font,
      fontSize,
      lineColours: {
        [previewLineCode]: { bg: safeBg, fg: safeFg },
      },
    })
      .then(result => {
        if (!cancelled) setPreviewSvg(result);
      })
      .catch(() => {
        if (!cancelled) setPreviewSvg("");
      });

    return () => {
      cancelled = true;
    };
  }, [bg, border, code, fg, font, fontSize]);

  if (!previewSvg) {
    return <span className="text-neutral-400">—</span>;
  }

  return (
    <span
      aria-label={`${code} badge preview`}
      className="block w-fit [&_svg]:block [&_svg]:h-8 [&_svg]:w-auto [&_svg]:overflow-visible"
      dangerouslySetInnerHTML={{ __html: previewSvg }}
      role="img"
    />
  );
}

export function App() {
  const fontFileInputRef = useRef<HTMLInputElement>(null);
  const stationCodeInputRef = useRef<HTMLInputElement>(null);
  const renderSequence = useRef(0);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [border, setBorder] = useState(2);
  const [colourRows, setColourRows] = useState(createDefaultColourRows);
  const [customFont, setCustomFont] = useState<CustomFont | null>(null);
  const [downloadError, setDownloadError] = useState("");
  const [fontError, setFontError] = useState("");
  const [fontSelection, setFontSelection] = useState("lta-identity");
  const [fontSize, setFontSize] = useState(28);
  const [fontWeight, setFontWeight] = useState(500);
  const [loadedFont, setLoadedFont] = useState<Font | null>(null);
  const [renderError, setRenderError] = useState("");
  const [stationCode, setStationCode] = useState("NS24:NE6:CC1");
  const [svg, setSvg] = useState("");

  const selectedFontChoice = FONT_CHOICES.find(choice => choice.id === fontSelection);
  const stationCodeState = useMemo(() => {
    const trimmedStationCode = stationCode.trim();
    if (!trimmedStationCode) return "empty";
    return STATION_CODE.test(trimmedStationCode) ? "valid" : "invalid";
  }, [stationCode]);
  const isStationCodeValid = stationCodeState === "valid";

  const lineColours = useMemo<LineColourOverrides>(() => {
    const overrides: LineColourOverrides = {};

    for (const row of colourRows) {
      const code = row.isFallback ? "default" : row.code.trim().toUpperCase();
      const bg = normaliseHex(row.bg);
      const fg = normaliseHex(row.fg);
      if (!code || (!bg && !fg)) continue;
      overrides[code] = {
        ...(bg ? { bg } : {}),
        ...(fg ? { fg } : {}),
      };
    }

    return overrides;
  }, [colourRows]);

  useEffect(() => {
    if (fontSelection === "uploaded") {
      setLoadedFont(customFont?.font ?? null);
      return;
    }

    const fontChoice = FONT_CHOICES.find(choice => choice.id === fontSelection);
    if (!fontChoice) return;

    let cancelled = false;
    setFontError("");
    setLoadedFont(null);

    const resolvedWeight = fontChoice.weights.includes(fontWeight)
      ? fontWeight
      : fontChoice.weights.includes(700)
        ? 700
        : (fontChoice.weights[0] ?? 400);
    if (resolvedWeight !== fontWeight) {
      setFontWeight(resolvedWeight);
      return;
    }

    const loadFont = async () => {
      const fontUrl = getFontUrl(fontChoice, resolvedWeight);
      const cachedFont = fontCache.get(fontUrl);
      if (cachedFont) return cachedFont;

      const response = await fetch(fontUrl);
      if (!response.ok) {
        throw new Error(`Could not load ${fontChoice.label} ${resolvedWeight}.`);
      }
      const font = opentype.parse(await response.arrayBuffer());
      fontCache.set(fontUrl, font);
      return font;
    };

    loadFont()
      .then(font => {
        if (!cancelled) setLoadedFont(font);
      })
      .catch(error => {
        if (!cancelled) {
          setFontError(error instanceof Error ? error.message : "Could not load this font.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [customFont, fontSelection, fontWeight]);

  useEffect(() => {
    const sequence = ++renderSequence.current;

    if (!loadedFont || !isStationCodeValid) {
      setSvg("");
      setRenderError("");
      return;
    }

    setRenderError("");

    generateSvg(stationCode, {
      border,
      font: loadedFont,
      fontSize,
      lineColours,
    })
      .then(result => {
        if (sequence === renderSequence.current) setSvg(result);
      })
      .catch(error => {
        if (sequence === renderSequence.current) {
          setRenderError(
            error instanceof Error ? error.message : "The badge could not be rendered.",
          );
        }
      });
  }, [border, fontSize, isStationCodeValid, lineColours, loadedFont, stationCode]);

  const updateColourRow = (id: string, field: "bg" | "code" | "fg", value: string) => {
    setColourRows(rows =>
      rows.map(row =>
        row.id === id
          ? {
              ...row,
              [field]: field === "code" ? value.toUpperCase() : value,
            }
          : row,
      ),
    );
  };

  const handleFontUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    setFontError("");
    try {
      const font = opentype.parse(await file.arrayBuffer());
      setCustomFont({ font, label: file.name });
      setFontSelection("uploaded");
    } catch {
      setFontError("That font could not be read. Try a TTF, OTF, or WOFF file.");
    }
  };

  const downloadSvg = () => {
    if (!isStationCodeValid || !svg) return;
    setDownloadError("");
    const withDeclaration = `<?xml version="1.0" encoding="UTF-8"?>\n${svg}`;
    downloadBlob(
      new Blob([withDeclaration], { type: "image/svg+xml;charset=utf-8" }),
      `${getExportName(stationCode)}.svg`,
    );
  };

  const downloadPng = async (pngHeight: number) => {
    if (!isStationCodeValid || !svg) return;
    setDownloadError("");

    try {
      const parsedSvg = new DOMParser().parseFromString(svg, "image/svg+xml").documentElement;
      const viewBox = parsedSvg.getAttribute("viewBox")?.trim().split(/\s+/).map(Number);
      if (!viewBox || viewBox.length !== 4 || !viewBox[2] || !viewBox[3]) {
        throw new Error("The badge dimensions could not be read.");
      }

      const outputWidth = Math.max(1, Math.round((viewBox[2] / viewBox[3]) * pngHeight));
      const canvas = document.createElement("canvas");
      canvas.width = outputWidth;
      canvas.height = pngHeight;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("PNG export is not supported by this browser.");

      const image = new Image();
      const objectUrl = URL.createObjectURL(
        new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
      );

      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("The SVG could not be converted to PNG."));
        image.src = objectUrl;
      });

      context.drawImage(image, 0, 0, outputWidth, pngHeight);
      URL.revokeObjectURL(objectUrl);

      const pngBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(blob => {
          if (blob) resolve(blob);
          else reject(new Error("The PNG file could not be created."));
        }, "image/png");
      });

      downloadBlob(pngBlob, `${getExportName(stationCode)}-${pngHeight}px.png`);
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : "The PNG could not be exported.");
    }
  };

  const canDownload = isStationCodeValid && Boolean(svg);
  const isRendering = isStationCodeValid && !svg && !fontError && !renderError;

  return (
    <div className="min-h-screen bg-white text-neutral-950 dark:bg-neutral-950 dark:text-neutral-100">
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-24">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-neutral-950 dark:text-neutral-50">
            MRT Badge Generator
          </h1>
          <a
            className="text-sm font-medium text-neutral-600 underline underline-offset-2 hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50 dark:focus-visible:outline-neutral-100"
            href="https://github.com/joulev/mrt-badges"
            rel="noreferrer"
            target="_blank"
          >
            GitHub
          </a>
        </header>

        <section className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div className="order-2 flex flex-col lg:order-1">
            <label
              className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
              htmlFor="station-code"
            >
              Station code
            </label>
            <div className="relative mt-2">
              <input
                autoCapitalize="characters"
                autoComplete="off"
                className="form-input block w-full rounded-lg border-0 bg-neutral-100 py-3 pl-4 pr-12 font-mono text-xl font-bold text-neutral-950 placeholder:text-neutral-400 focus:ring-2 focus:ring-neutral-900 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:ring-neutral-300"
                id="station-code"
                onChange={event => setStationCode(event.currentTarget.value.toUpperCase())}
                placeholder="NS24:NE6:CC1"
                ref={stationCodeInputRef}
                spellCheck={false}
                value={stationCode}
              />
              {stationCode ? (
                <button
                  aria-label="Clear station code"
                  className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-md text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-100 dark:focus-visible:outline-neutral-100"
                  onClick={() => {
                    setStationCode("");
                    stationCodeInputRef.current?.focus();
                  }}
                  type="button"
                >
                  <X aria-hidden="true" size={18} />
                </button>
              ) : null}
            </div>
            <p className="mt-2 text-xs leading-5 text-neutral-500 dark:text-neutral-400">
              <code className="rounded border border-neutral-300 bg-neutral-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-neutral-800 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100">
                :
              </code>{" "}
              interchange ·{" "}
              <code className="rounded border border-neutral-300 bg-neutral-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-neutral-800 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100">
                -
              </code>{" "}
              tap-out transfer
            </p>
            <fieldset className="mt-3 flex flex-wrap gap-2">
              <legend className="sr-only">Station code examples</legend>
              {EXAMPLES.map(example => (
                <button
                  className="rounded-md bg-neutral-100 px-3 py-1.5 font-mono text-xs font-medium text-neutral-700 hover:bg-neutral-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:focus-visible:outline-neutral-100"
                  key={example}
                  onClick={() => setStationCode(example)}
                  type="button"
                >
                  {example}
                </button>
              ))}
            </fieldset>

            <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
              LTA Identity font (unofficial) taken from{" "}
              <a
                className="underline underline-offset-2 hover:text-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 dark:hover:text-neutral-200 dark:focus-visible:outline-neutral-100"
                href="https://github.com/jglim/IdentityFont"
                rel="noreferrer"
                target="_blank"
              >
                jglim/IdentityFont
              </a>
            </p>

            <button
              aria-controls="advanced-settings"
              aria-expanded={advancedOpen}
              className="mt-8 flex min-h-11 w-full items-center justify-between border-t border-neutral-200 pt-4 text-left text-sm font-semibold text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 dark:border-neutral-700 dark:text-neutral-100 dark:focus-visible:outline-neutral-100 lg:mt-auto"
              onClick={() => setAdvancedOpen(open => !open)}
              type="button"
            >
              Advanced Settings
              <ChevronDown
                aria-hidden="true"
                className={`transition-transform ${advancedOpen ? "rotate-180" : ""}`}
                size={18}
              />
            </button>
          </div>

          <div className="order-1 flex min-h-[320px] flex-col rounded-xl border border-neutral-200 bg-neutral-100 p-5 text-neutral-950 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white sm:p-6 lg:order-2">
            <div>
              <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                Preview
              </span>
            </div>

            <div
              aria-busy={isRendering}
              className="flex min-w-0 flex-1 items-center justify-center overflow-hidden py-10"
            >
              {stationCodeState === "empty" ? null : stationCodeState === "invalid" ? (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Invalid station identifier
                </p>
              ) : svg ? (
                <div
                  aria-label={`Preview of ${stationCode}`}
                  className="flex w-full min-w-0 justify-center px-2 [&_svg]:block [&_svg]:h-auto [&_svg]:max-h-32 [&_svg]:max-w-full [&_svg]:w-auto"
                  dangerouslySetInnerHTML={{ __html: svg }}
                  role="img"
                />
              ) : (
                <div className="text-center text-sm text-neutral-500 dark:text-neutral-400">
                  {fontError || renderError || "Rendering…"}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <PngDownloadPopover disabled={!canDownload} onSelect={downloadPng} />
              <DownloadButton disabled={!canDownload} onClick={downloadSvg} primary>
                Download SVG
              </DownloadButton>
            </div>
            {downloadError ? (
              <p className="mt-3 text-xs text-red-700 dark:text-red-300" role="alert">
                {downloadError}
              </p>
            ) : null}
          </div>
        </section>

        {advancedOpen ? (
          <section
            className="mt-10 lg:border-t border-neutral-200 lg:pt-8 dark:border-neutral-700"
            id="advanced-settings"
          >
            <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
              <div>
                <h2 className="text-lg font-semibold text-neutral-950 dark:text-neutral-50">
                  Font and dimensions
                </h2>

                <div className="mt-6 grid gap-8 sm:grid-cols-2">
                  <div>
                    <label
                      className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
                      htmlFor="font-family"
                    >
                      Font family
                    </label>
                    <div className="mt-2">
                      <select
                        className="form-select min-h-11 w-full rounded-lg border-0 bg-neutral-100 px-3 py-2.5 text-sm text-neutral-900 focus:ring-2 focus:ring-neutral-900 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:ring-neutral-300"
                        id="font-family"
                        onChange={event => setFontSelection(event.currentTarget.value)}
                        value={fontSelection}
                      >
                        {FONT_CHOICES.map(choice => (
                          <option key={choice.id} value={choice.id}>
                            {choice.label}
                          </option>
                        ))}
                        {customFont ? (
                          <optgroup label="Uploaded">
                            <option value="uploaded">{customFont.label}</option>
                          </optgroup>
                        ) : null}
                      </select>
                      <input
                        accept=".ttf,.otf,.woff,font/ttf,font/otf,font/woff"
                        aria-label="Upload a font file"
                        className="sr-only"
                        onChange={handleFontUpload}
                        ref={fontFileInputRef}
                        type="file"
                      />
                      <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                        Or,{" "}
                        <button
                          className="underline underline-offset-2 hover:text-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 dark:hover:text-neutral-200 dark:focus-visible:outline-neutral-100"
                          onClick={() => fontFileInputRef.current?.click()}
                          type="button"
                        >
                          upload a font file
                        </button>
                      </p>
                    </div>
                  </div>

                  <div>
                    <label
                      className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
                      htmlFor="font-weight"
                    >
                      Font weight
                    </label>
                    <select
                      className="form-select mt-2 min-h-11 w-full rounded-lg border-0 bg-neutral-100 px-3 py-2.5 text-sm text-neutral-900 focus:ring-2 focus:ring-neutral-900 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:ring-neutral-300"
                      disabled={fontSelection === "uploaded" || !selectedFontChoice}
                      id="font-weight"
                      onChange={event => setFontWeight(Number(event.currentTarget.value))}
                      value={fontSelection === "uploaded" ? "embedded" : fontWeight}
                    >
                      {fontSelection === "uploaded" ? (
                        <option value="embedded">File default</option>
                      ) : (
                        selectedFontChoice?.weights.map(weight => (
                          <option key={weight} value={weight}>
                            {FONT_WEIGHT_LABELS[weight] ?? weight} · {weight}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {fontError ? (
                    <p
                      className="text-xs font-medium text-red-700 dark:text-red-300 sm:col-span-2"
                      role="alert"
                    >
                      {fontError}
                    </p>
                  ) : null}
                </div>

                <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  <SliderField
                    label="Border size"
                    max={10}
                    min={0}
                    onChange={setBorder}
                    suffix="px"
                    value={border}
                  />
                  <SliderField
                    label="Font size"
                    max={42}
                    min={14}
                    onChange={setFontSize}
                    suffix="px"
                    value={fontSize}
                  />
                </div>
              </div>

              <div className="min-w-0">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-lg font-semibold text-neutral-950 dark:text-neutral-50">
                    Line colours
                  </h2>
                  <button
                    className="inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-xs font-medium text-neutral-600 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:focus-visible:outline-neutral-100"
                    onClick={() => setColourRows(createDefaultColourRows())}
                    type="button"
                  >
                    <RotateCcw aria-hidden="true" size={14} />
                    Reset
                  </button>
                </div>

                <div className="mt-4 overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[610px] border-collapse text-left">
                      <thead className="bg-neutral-50 text-xs text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
                        <tr>
                          <th className="px-4 py-3 font-medium">Line code</th>
                          <th className="px-4 py-3 font-medium">Foreground</th>
                          <th className="px-4 py-3 font-medium">Background</th>
                          <th className="px-4 py-3 font-medium">Preview</th>
                          <th aria-label="Actions" className="w-12 px-2 py-3" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200 [&>tr>td]:align-middle dark:divide-neutral-700">
                        {colourRows.map(row => (
                          <tr key={row.id}>
                            <td className="px-4 py-3">
                              {row.isFallback ? (
                                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                  Fallback
                                </span>
                              ) : (
                                <input
                                  aria-label="Line code"
                                  className="form-input w-20 rounded-md border-0 bg-neutral-100 px-2.5 py-2 font-mono text-xs font-semibold uppercase text-neutral-800 focus:ring-2 focus:ring-neutral-900 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:ring-neutral-300"
                                  maxLength={8}
                                  onChange={event =>
                                    updateColourRow(row.id, "code", event.currentTarget.value)
                                  }
                                  value={row.code}
                                />
                              )}
                            </td>
                            {(["fg", "bg"] as const).map(field => (
                              <td className="px-4 py-3" key={field}>
                                <div className="flex items-center gap-2">
                                  <input
                                    aria-label={`${row.isFallback ? "Fallback" : row.code} ${field === "fg" ? "foreground" : "background"} colour picker`}
                                    className="h-9 w-9 shrink-0 rounded-md border-0 bg-neutral-100 p-1 dark:bg-neutral-800"
                                    onChange={event =>
                                      updateColourRow(
                                        row.id,
                                        field,
                                        event.currentTarget.value.toUpperCase(),
                                      )
                                    }
                                    type="color"
                                    value={getSafeColour(row[field], "#000000")}
                                  />
                                  <input
                                    aria-label={`${row.isFallback ? "Fallback" : row.code} ${field === "fg" ? "foreground" : "background"} hex colour`}
                                    className="form-input w-24 shrink-0 rounded-md border-0 bg-neutral-100 px-2 py-2 font-mono text-xs uppercase text-neutral-700 focus:ring-2 focus:ring-neutral-900 dark:bg-neutral-800 dark:text-neutral-200 dark:focus:ring-neutral-300"
                                    maxLength={7}
                                    onChange={event =>
                                      updateColourRow(row.id, field, event.currentTarget.value)
                                    }
                                    value={row[field]}
                                  />
                                </div>
                              </td>
                            ))}
                            <td className="px-4 py-3">
                              <LineBadgePreview
                                bg={row.bg}
                                border={border}
                                code={
                                  row.isFallback
                                    ? "XX"
                                    : row.code.trim()
                                      ? `${row.code.trim().toUpperCase()}1`
                                      : ""
                                }
                                fg={row.fg}
                                font={loadedFont}
                                fontSize={fontSize}
                              />
                            </td>
                            <td className="px-2 py-3">
                              {row.isFallback ? null : (
                                <button
                                  aria-label={`Remove ${row.code || "colour"} row`}
                                  className="grid h-9 w-9 place-items-center rounded-md text-neutral-400 hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 dark:hover:bg-red-950 dark:hover:text-red-300 dark:focus-visible:outline-red-300"
                                  onClick={() =>
                                    setColourRows(rows =>
                                      rows.filter(candidate => candidate.id !== row.id),
                                    )
                                  }
                                  type="button"
                                >
                                  <Trash2 aria-hidden="true" size={16} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <button
                  className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-md bg-neutral-100 px-4 text-sm font-medium text-neutral-700 hover:bg-neutral-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:focus-visible:outline-neutral-100"
                  onClick={() =>
                    setColourRows(rows => {
                      const newRow: ColourRow = {
                        bg: "#3867D6",
                        code: "XX",
                        fg: "#FFFFFF",
                        id: nextRowId("custom"),
                        isFallback: false,
                      };
                      const fallbackIndex = rows.findIndex(row => row.isFallback);

                      if (fallbackIndex === -1) return [...rows, newRow];

                      return [
                        ...rows.slice(0, fallbackIndex),
                        newRow,
                        ...rows.slice(fallbackIndex),
                      ];
                    })
                  }
                  type="button"
                >
                  <Plus aria-hidden="true" size={16} />
                  Add line
                </button>
              </div>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
