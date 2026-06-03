import type {
  LineColour,
  LineColourOverrides,
  Station,
  StationCode,
} from "./types";

export const lineForegroundColour = {
  dark: "#231F20",
  light: "white",
} as const;

const lineColour: Record<string, LineColour> = {
  // North–South Line
  // Official vector source: https://www.lta.gov.sg/content/dam/ltagov/img/map/mrt/Icon_NorthSouthLine.svg
  NS: { bg: "#E1251B", fg: lineForegroundColour.light },
  // East–West Line
  // Official vector source: https://www.lta.gov.sg/content/dam/ltagov/img/map/mrt/Icon_EastWestLine.svg
  EW: { bg: "#00953B", fg: lineForegroundColour.light },
  CG: { bg: "#00953B", fg: lineForegroundColour.light },
  // North East Line
  // Official vector source: https://www.lta.gov.sg/content/dam/ltagov/img/map/mrt/Icon_NorthEastLine.svg
  NE: { bg: "#9E28B5", fg: lineForegroundColour.light },
  // Circle Line
  // Official vector source: https://www.lta.gov.sg/content/dam/ltagov/img/map/mrt/Icon_CircleLine.svg
  CC: { bg: "#FF9E18", fg: lineForegroundColour.dark },
  CE: { bg: "#FF9E18", fg: lineForegroundColour.dark },
  // Downtown Line
  // Official vector source: https://www.lta.gov.sg/content/dam/ltagov/img/map/mrt/Icon_Downtown_Line.svg
  DE: { bg: "#005DA6", fg: lineForegroundColour.light },
  DT: { bg: "#005DA6", fg: lineForegroundColour.light },
  // Thomson–East Coast Line
  // Official vector source: https://www.lta.gov.sg/content/dam/ltagov/img/map/mrt/Icon_Thomson_East_Coast_Line.svg
  TE: { bg: "#9D5918", fg: lineForegroundColour.light },
  // Jurong Region Line
  // Unofficial source (slightly inaccurate): https://en.wikipedia.org/wiki/Module:Adjacent_stations/SMRT
  // Unable to find official high quality or vector sources as of 13 March 2024
  JR: { bg: "#00B0BE", fg: lineForegroundColour.light },
  JS: { bg: "#00B0BE", fg: lineForegroundColour.light },
  JW: { bg: "#00B0BE", fg: lineForegroundColour.light },
  JE: { bg: "#00B0BE", fg: lineForegroundColour.light },
  // Cross Island Line
  // Official high quality source: https://www.lta.gov.sg/content/ltagov/en/upcoming_projects/rail_expansion/cross_island_line/_jcr_content/par/image.img.png/1663662075251.png
  CR: { bg: "#94C83D", fg: lineForegroundColour.dark },
  CP: { bg: "#94C83D", fg: lineForegroundColour.dark },
  // LRT colours
  // Official vector source: https://www.lta.gov.sg/content/dam/ltagov/img/map/mrt/Icon_Bukit_Panjang_LRT.svg
  default: { bg: "#718472", fg: lineForegroundColour.light },
};

function getBaseLineColour(lineCode: string): LineColour {
  const lineOnlyCode = getLineOnlyCode(lineCode);
  return lineCode in lineColour
    ? lineColour[lineCode]
    : lineOnlyCode && lineOnlyCode in lineColour
      ? lineColour[lineOnlyCode]
      : lineColour.default;
}

function getLineOnlyCode(lineCode: string) {
  return lineCode.length > 2 && lineCode.endsWith("L")
    ? lineCode.slice(0, -1)
    : null;
}

function getLineColour(
  lineCode: string,
  overrides?: LineColourOverrides,
): LineColour {
  const baseColour = getBaseLineColour(lineCode);
  const lineOnlyCode = getLineOnlyCode(lineCode);
  const override =
    overrides?.[lineCode] ??
    (lineOnlyCode ? overrides?.[lineOnlyCode] : undefined);

  if (!override) return baseColour;

  return {
    bg: override.bg ?? baseColour.bg,
    fg: override.fg ?? (override.bg ? lineColour.default.fg : baseColour.fg),
  };
}

export function getStationDetails(
  station: string,
  lineColourOverrides?: LineColourOverrides,
): Station {
  return station
    .trim()
    .split("-")
    .map((connectedPart) =>
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
    .filter((part) => part.length > 0);
}
