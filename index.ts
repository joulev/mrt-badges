import { ltaFontManager } from "./lib/cache";
import { generateSvg } from "./lib/generate-svg";
import { lineForegroundColour } from "./lib/get-station-details";
import type { LineColour, LineColourOverrides } from "./lib/types";

const indexHtml = Bun.file(new URL("./static/index.html", import.meta.url));
const clientJavascript = Bun.file(new URL("./static/dist/app.js", import.meta.url));
const clientStyles = Bun.file(new URL("./static/dist/styles.css", import.meta.url));

const LINE_COLOUR_PARAM = /^(?<kind>bg|fg)_(?<lineCode>[a-z]+)$/i;
const HEX_COLOUR = /^#?(?<hex>[0-9a-f]{3}|[0-9a-f]{6})$/i;

function normaliseHexColour(rawColour: string) {
  const match = HEX_COLOUR.exec(rawColour.trim());
  if (!match?.groups) return null;
  return `#${match.groups.hex.toUpperCase()}`;
}

function normaliseForegroundColour(rawColour: string) {
  const foreground = rawColour.trim().toLowerCase();
  if (foreground === "dark" || foreground === "light") return lineForegroundColour[foreground];
  return normaliseHexColour(rawColour);
}

function normaliseLineColour(kind: keyof LineColour, rawColour: string) {
  return kind === "fg" ? normaliseForegroundColour(rawColour) : normaliseHexColour(rawColour);
}

function getLineColourOverrides(searchParams: URLSearchParams): LineColourOverrides | undefined {
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

async function getStationBadgeResponse(station: string, searchParams: URLSearchParams) {
  const border = Number.parseInt(searchParams.get("border") || "");
  const svg = await generateSvg(station, {
    border: Number.isNaN(border) ? undefined : border,
    lineColours: getLineColourOverrides(searchParams),
  });

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": `public, s-maxage=${60 * 60 * 24}, max-age=${60 * 60 * 24}`,
    },
  });
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
    "/assets/app.js": {
      GET: () =>
        new Response(clientJavascript, {
          headers: {
            "Content-Type": "text/javascript; charset=utf-8",
          },
        }),
    },
    "/assets/styles.css": {
      GET: () =>
        new Response(clientStyles, {
          headers: {
            "Content-Type": "text/css; charset=utf-8",
          },
        }),
    },
    "/fonts/LTAIdentity.ttf": {
      GET: async () =>
        new Response(await ltaFontManager.getFont(), {
          headers: {
            "Cache-Control": "public, max-age=86400",
            "Content-Type": "font/ttf",
          },
        }),
    },
    "/favicon.ico": {
      GET: () => getStationBadgeResponse("MRT", new URLSearchParams()),
    },
    "/:station": {
      GET: request => {
        const url = new URL(request.url);
        return getStationBadgeResponse(request.params.station, url.searchParams);
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
