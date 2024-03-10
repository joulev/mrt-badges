import type { LineColour, Station, StationCode } from "./types";

const lineColour: Record<string, LineColour> = {
  // North–South Line
  NS: { bg: "#e22726", fg: "white" },
  // East–West Line
  EW: { bg: "#01964c", fg: "white" },
  CG: { bg: "#01964c", fg: "white" },
  // North East Line
  NE: { bg: "#8f4199", fg: "white" },
  // Circle Line
  CC: { bg: "#f99d25", fg: "black" },
  CE: { bg: "#f99d25", fg: "black" },
  // Downtown Line
  DT: { bg: "#015ca7", fg: "white" },
  // Thomson–East Coast Line
  TE: { bg: "#9d5b24", fg: "white" },
  // Other lines will be added later
  // LRT colours
  default: { bg: "#718573", fg: "white" },
};

export function getStationDetails(station: string): Station {
  return station
    .trim()
    .split("-")
    .map(connectedPart =>
      connectedPart
        .split(":")
        .map((code): StationCode | null => {
          const match = /(?<line>[A-Z]+)(?<num>\d*)/.exec(code);
          if (!match?.groups) return null;
          const lineCode = match.groups.line;
          const colour =
            lineCode in lineColour
              ? lineColour[lineCode]
              : lineCode.endsWith("L") && lineCode.slice(0, -1) in lineColour
                ? lineColour[lineCode.slice(0, -1)]
                : lineColour.default;
          return { lineCode, number: match.groups.num, colour };
        })
        .filter((x): x is StationCode => Boolean(x)),
    )
    .filter(part => part.length > 0);
}
