export interface LineColour {
  fg: string;
  bg: string;
}

export interface StationCode {
  lineCode: string;
  number: string;
  colour: LineColour;
}

// Parts are not connected by a ticketed link (tap out to transfer)
export type StationCodePart = StationCode[];

export type Station = StationCodePart[];

export interface Options {
  border?: number;
}
