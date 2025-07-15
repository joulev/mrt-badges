import type { LineColour, Station, StationCode } from "./types";

const lineColour: Record<string, LineColour> = {
  // North–South Line
  // Official vector source: https://www.lta.gov.sg/content/dam/ltagov/img/map/mrt/Icon_NorthSouthLine.svg
  NS: { bg: "#E1251B", fg: "white" },
  // East–West Line
  // Official vector source: https://www.lta.gov.sg/content/dam/ltagov/img/map/mrt/Icon_EastWestLine.svg
  EW: { bg: "#00953B", fg: "white" },
  CG: { bg: "#00953B", fg: "white" },
  // North East Line
  // Official vector source: https://www.lta.gov.sg/content/dam/ltagov/img/map/mrt/Icon_NorthEastLine.svg
  NE: { bg: "#9E28B5", fg: "white" },
  // Circle Line
  // Official vector source: https://www.lta.gov.sg/content/dam/ltagov/img/map/mrt/Icon_CircleLine.svg
  CC: { bg: "#FF9E18", fg: "#231F20" },
  CE: { bg: "#FF9E18", fg: "#231F20" },
  // Downtown Line
  // Official vector source: https://www.lta.gov.sg/content/dam/ltagov/img/map/mrt/Icon_Downtown_Line.svg
  DE: { bg: "#005DA6", fg: "white" },
  DT: { bg: "#005DA6", fg: "white" },
  // Thomson–East Coast Line
  // Official vector source: https://www.lta.gov.sg/content/dam/ltagov/img/map/mrt/Icon_Thomson_East_Coast_Line.svg
  TE: { bg: "#9D5918", fg: "white" },
  // Jurong Region Line
  // Unofficial source (slightly inaccurate): https://en.wikipedia.org/wiki/Module:Adjacent_stations/SMRT
  // Unable to find official high quality or vector sources as of 13 March 2024
  JR: { bg: "#00B0BE", fg: "white" },
  JS: { bg: "#00B0BE", fg: "white" },
  JW: { bg: "#00B0BE", fg: "white" },
  JE: { bg: "#00B0BE", fg: "white" },
  // Cross Island Line
  // Official high quality source: https://www.lta.gov.sg/content/ltagov/en/upcoming_projects/rail_expansion/cross_island_line/_jcr_content/par/image.img.png/1663662075251.png
  CR: { bg: "#94C83D", fg: "#2C2925" },
  CP: { bg: "#94C83D", fg: "#2C2925" },
  // LRT colours
  // Official vector source: https://www.lta.gov.sg/content/dam/ltagov/img/map/mrt/Icon_Bukit_Panjang_LRT.svg
  default: { bg: "#718472", fg: "white" },
};

export function getStationDetails(station: string): Station {
  return station
    .trim()
    .split("-")
    .map(connectedPart =>
      connectedPart
        .split(":")
        .map((code): StationCode | null => {
          const match = /(?<line>[A-Z]+)(?<num>\d*[A-Z]?)/.exec(code);
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
