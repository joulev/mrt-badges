export interface LineColour {
  fg: string;
  bg: string;
}

export type LineColourOverrides = Record<string, Partial<LineColour>>;

export interface StationCode {
  lineCode: string;
  number: string;
  colour: LineColour;
  // "Under study" stations are rendered with a dashed border instead of a solid one. Marked in the
  // input by wrapping the code in curly braces, e.g. `{JW1}:NS6` makes only the JW1 border dashed.
  underStudy: boolean;
}

// Parts are not connected by a ticketed link (tap out to transfer)
export type StationCodePart = StationCode[];

export type Station = StationCodePart[];

export interface Options {
  border?: number;
  lineColours?: LineColourOverrides;
}
