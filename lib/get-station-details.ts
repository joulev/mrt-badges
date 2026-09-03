import type { LineColour, LineColourOverrides, Station, StationCode } from "./types";

export const lineForegroundColour = {
  dark: "#2E2A25",
  light: "white",
} as const;

// Digital-sign palette from the LTA identity guideline.
export const defaultLineColours: Record<string, LineColour> = {
  // North–South Line
  NS: { bg: "#DF2827", fg: lineForegroundColour.light },
  // East–West Line
  EW: { bg: "#009645", fg: lineForegroundColour.light },
  CG: { bg: "#009645", fg: lineForegroundColour.light },
  // North East Line
  NE: { bg: "#9900AB", fg: lineForegroundColour.light },
  // Circle Line
  CC: { bg: "#FA9E0D", fg: lineForegroundColour.dark },
  CE: { bg: "#FA9E0D", fg: lineForegroundColour.dark },
  // Downtown Line
  DE: { bg: "#0055B8", fg: lineForegroundColour.light },
  DT: { bg: "#0055B8", fg: lineForegroundColour.light },
  // Thomson–East Coast Line
  TE: { bg: "#9D5918", fg: lineForegroundColour.light },
  // Jurong Region Line
  JR: { bg: "#00ADBB", fg: lineForegroundColour.light },
  JS: { bg: "#00ADBB", fg: lineForegroundColour.light },
  JW: { bg: "#00ADBB", fg: lineForegroundColour.light },
  JE: { bg: "#00ADBB", fg: lineForegroundColour.light },
  // Cross Island Line
  CR: { bg: "#93D500", fg: lineForegroundColour.dark },
  CP: { bg: "#93D500", fg: lineForegroundColour.dark },
  // LRT colours
  default: { bg: "#708270", fg: lineForegroundColour.light },
};

function getBaseLineColour(lineCode: string): LineColour {
  const lineOnlyCode = getLineOnlyCode(lineCode);
  return lineCode in defaultLineColours
    ? defaultLineColours[lineCode]
    : lineOnlyCode && lineOnlyCode in defaultLineColours
      ? defaultLineColours[lineOnlyCode]
      : defaultLineColours.default;
}

function getLineOnlyCode(lineCode: string) {
  return lineCode.length > 2 && lineCode.endsWith("L") ? lineCode.slice(0, -1) : null;
}

function getLineColour(lineCode: string, overrides?: LineColourOverrides): LineColour {
  const baseColour = getBaseLineColour(lineCode);
  const lineOnlyCode = getLineOnlyCode(lineCode);
  const override =
    overrides?.[lineCode] ??
    (lineOnlyCode ? overrides?.[lineOnlyCode] : undefined) ??
    overrides?.default;

  if (!override) return baseColour;

  return {
    bg: override.bg ?? baseColour.bg,
    fg: override.fg ?? (override.bg ? defaultLineColours.default.fg : baseColour.fg),
  };
}

export function getStationDetails(
  station: string,
  lineColourOverrides?: LineColourOverrides,
): Station {
  return station
    .trim()
    .split("-")
    .map(connectedPart =>
      connectedPart
        .split(":")
        .map((rawCode): StationCode | null => {
          // A code wrapped in curly braces (e.g. `{JW1}`) is an "under study" station, rendered
          // with a dashed border. The braces are stripped before parsing the line code and number.
          const code = rawCode.trim();
          const underStudy = code.startsWith("{") && code.endsWith("}");
          const inner = underStudy ? code.slice(1, -1) : code;
          const match = /(?<line>[A-Z]+)(?<num>\d*[A-Z]?)/.exec(inner);
          if (!match?.groups) return null;
          const lineCode = match.groups.line;
          const colour = getLineColour(lineCode, lineColourOverrides);
          return { lineCode, number: match.groups.num, colour, underStudy };
        })
        .filter((x): x is StationCode => Boolean(x)),
    )
    .filter(part => part.length > 0);
}
