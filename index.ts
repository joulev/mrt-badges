import { generateSvg } from "./lib/generate-svg";
import { lineForegroundColour } from "./lib/get-station-details";
import type { LineColour, LineColourOverrides } from "./lib/types";

const indexHtml = Bun.file(new URL("./static/index.html", import.meta.url));

const LINE_COLOUR_PARAM = /^(?<kind>bg|fg)_(?<lineCode>[a-z]+)$/i;
const HEX_COLOUR = /^#?(?<hex>[0-9a-f]{3}|[0-9a-f]{6})$/i;

function normaliseHexColour(rawColour: string) {
  const match = HEX_COLOUR.exec(rawColour.trim());
  if (!match?.groups) return null;
  return `#${match.groups.hex.toUpperCase()}`;
}

function normaliseForegroundColour(rawColour: string) {
  const foreground = rawColour.trim().toLowerCase();
  if (foreground === "dark" || foreground === "light")
    return lineForegroundColour[foreground];
  return normaliseHexColour(rawColour);
}

function normaliseLineColour(kind: keyof LineColour, rawColour: string) {
  return kind === "fg"
    ? normaliseForegroundColour(rawColour)
    : normaliseHexColour(rawColour);
}

function getLineColourOverrides(
  searchParams: URLSearchParams,
): LineColourOverrides | undefined {
  const lineColours: LineColourOverrides = {};

  for (const [param, rawColour] of searchParams) {
    const match = LINE_COLOUR_PARAM.exec(param);
    if (!match?.groups) continue;

    const kind = match.groups.kind.toLowerCase() as keyof LineColour;
    const colour = normaliseLineColour(kind, rawColour);
    if (!colour) continue;

    const lineCode = match.groups.lineCode.toUpperCase();
    lineColours[lineCode] = {
      ...lineColours[lineCode],
      [kind]: colour,
    };
  }

  return Object.keys(lineColours).length > 0 ? lineColours : undefined;
}

const server = Bun.serve({
  routes: {
    "/": {
      GET: () =>
        new Response(indexHtml, {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
          },
        }),
    },
    "/:station": {
      GET: async (request) => {
        const url = new URL(request.url);
        const station = request.params.station;
        const border = Number.parseInt(url.searchParams.get("border") || "");

        const svg = await generateSvg(station, {
          border: Number.isNaN(border) ? undefined : border,
          lineColours: getLineColourOverrides(url.searchParams),
        });
        return new Response(svg, {
          headers: {
            "Content-Type": "image/svg+xml",
            "Cache-Control": `public, s-maxage=${60 * 60 * 24}, max-age=${60 * 60 * 24}`,
          },
        });
      },
      OPTIONS: () => {
        return new Response(null, {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
          },
        });
      },
    },
  },
});

console.log(`Serving on port ${server.port}`);
