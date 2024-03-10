import React from "react";
import satori from "satori";
import { getStationDetails } from "./get-station-details";
import type { Options, Station, StationCode, StationCodePart } from "./types";

// Source: LTA Identity Font Typeface.zip in https://github.com/jglim/IdentityFont/issues/3
// LTA Identity.ttf file
// Reason we have to do this: The ttf/woff file hosted in the repo doesn't work with Satori for some
// reasons (probably Satori's fault), but the ttf file uploaded in the issue works fine.
const FONT_URL = "https://r2.joulev.dev/files/v9w4vh2nf0t8mxk71y4zi4xs";

// Increase this for easier development
const SCALE = 0.5;

const FONT_SIZE = 27 * SCALE;
const BORDER = 2 * SCALE;
const CODE_WIDTH = 84 * SCALE;
const CODE_HEIGHT = 50 * SCALE;
const CODE_GAP = 4 * SCALE;
const CODE_TEXT_HEIGHT = 19 * SCALE;
const CODE_TEXT_SHIFT_UP = 1 * SCALE;
const CODE_SEPARATOR_WIDTH = 3 * SCALE;
const PART_BORDER_RADIUS_X = 15 * SCALE;
const PART_GAP = 24 * SCALE;
const PART_CONNECTOR_WIDTH_OFFSET = 2 * SCALE;
const PART_CONNECTOR_HEIGHT = 11 * SCALE;
const PART_CONNECTOR_DX = 2 * SCALE;
const BORDER_COLOUR = "white";

async function getFont() {
  const response = await fetch(FONT_URL);
  return await response.arrayBuffer();
}

function StationCodeDisplay({ code }: { code: StationCode }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: CODE_WIDTH,
        height: CODE_HEIGHT,
        backgroundColor: code.colour.bg,
        color: code.colour.fg,
      }}
    >
      {/* "good enough"? */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          transform: `translateY(-${CODE_TEXT_SHIFT_UP}px)`,
          gap: CODE_GAP,
          lineHeight: `${CODE_TEXT_HEIGHT}px`,
          height: CODE_TEXT_HEIGHT,
        }}
      >
        <span>{code.lineCode}</span>
        <span>{code.number}</span>
      </div>
    </div>
  );
}

function StationCodeSeparator({
  codeLeft,
  codeRight,
}: { codeLeft: StationCode | undefined; codeRight: StationCode | undefined }) {
  if (!codeLeft || !codeRight) return null;
  if (codeLeft.colour.bg !== codeRight.colour.bg) return null;
  return <div style={{ height: "100%", background: BORDER_COLOUR, width: CODE_SEPARATOR_WIDTH }} />;
}

function StationPartDisplay({ part, options }: { part: StationCodePart; options: Options }) {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "row",
        border: `${options.border || BORDER}px solid ${BORDER_COLOUR}`,
        borderRadius: `${PART_BORDER_RADIUS_X}px/50%`,
        overflow: "hidden",
      }}
    >
      {part.map((code, j) => (
        <React.Fragment key={j}>
          <StationCodeDisplay code={code} />
          <StationCodeSeparator codeLeft={part.at(j)} codeRight={part.at(j + 1)} />
        </React.Fragment>
      ))}
    </div>
  );
}

function StationPartSeparator({
  leftIndex,
  rightIndex,
  station,
  partWidths,
  options,
}: {
  leftIndex: number;
  rightIndex: number;
  station: Station;
  partWidths: number[];
  options: Options;
}) {
  const partLeft = station.at(leftIndex);
  const partRight = station.at(rightIndex);
  if (!partLeft || !partRight) return null;

  const rightmostPointPartLeft =
    partWidths.slice(0, leftIndex + 1).reduce((a, b) => a + b + PART_GAP, 0) - PART_GAP;

  const border = options.border || BORDER;
  const partConnectorWidth = PART_GAP + border * 2 + PART_CONNECTOR_WIDTH_OFFSET * 2;

  return (
    <>
      <div
        style={{
          position: "absolute",
          background: partLeft[partLeft.length - 1].colour.bg,
          height: PART_CONNECTOR_HEIGHT,
          width: partConnectorWidth / 2 + PART_CONNECTOR_DX,
          top: CODE_HEIGHT / 2 - PART_CONNECTOR_HEIGHT / 2 + border,
          left: rightmostPointPartLeft - (partConnectorWidth - PART_GAP) / 2,
          clipPath: `polygon(0 0, ${partConnectorWidth / 2 + PART_CONNECTOR_DX}px 0, ${
            partConnectorWidth / 2 - PART_CONNECTOR_DX
          }px 100%, 0 100%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          background: partRight[0].colour.bg,
          height: PART_CONNECTOR_HEIGHT,
          width: partConnectorWidth / 2 + PART_CONNECTOR_DX,
          top: CODE_HEIGHT / 2 - PART_CONNECTOR_HEIGHT / 2 + border,
          left: rightmostPointPartLeft + PART_GAP / 2 - PART_CONNECTOR_DX,
          clipPath: `polygon(${PART_CONNECTOR_DX * 2} 0, ${
            partConnectorWidth / 2 + PART_CONNECTOR_DX
          } 0, ${partConnectorWidth / 2 + PART_CONNECTOR_DX} 100%, 0 100%)`,
        }}
      />
    </>
  );
}

function StationBadge({ station, options }: { station: Station; options: Options }) {
  const border = options.border || BORDER;

  if (station.length === 0)
    return (
      <div
        style={{
          height: CODE_HEIGHT + border * 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: "red",
          color: "white",
        }}
      >
        Invalid station identifier
      </div>
    );

  const partWidths = station.map(
    part =>
      part
        .map((_, i) => {
          const codeLeft = part.at(i);
          const codeRight = part.at(i + 1);
          if (!codeLeft || !codeRight || codeLeft.colour.bg !== codeRight.colour.bg)
            return CODE_WIDTH;
          return CODE_WIDTH + CODE_SEPARATOR_WIDTH;
        })
        .reduce((a, b) => a + b, 0) +
      border * 2,
  );
  const fullWidth = partWidths.reduce((a, b) => a + b + PART_GAP, 0) - PART_GAP;

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        fontSize: FONT_SIZE,
        height: CODE_HEIGHT + border * 2,
        width: fullWidth,
      }}
    >
      <div
        style={{
          position: "absolute",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          top: 0,
          bottom: 0,
          left: PART_BORDER_RADIUS_X,
          right: PART_BORDER_RADIUS_X,
        }}
      >
        <div
          style={{
            width: "100%",
            height: PART_CONNECTOR_HEIGHT + border * 2,
            borderTop: `${border}px solid ${BORDER_COLOUR}`,
            borderBottom: `${border}px solid ${BORDER_COLOUR}`,
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          inset: 0,
          gap: PART_GAP,
        }}
      >
        {station.map((part, i) => (
          <StationPartDisplay part={part} options={options} key={i} />
        ))}
      </div>
      {station.map((_, i) => (
        <StationPartSeparator
          key={i}
          leftIndex={i}
          rightIndex={i + 1}
          station={station}
          partWidths={partWidths}
          options={options}
        />
      ))}
    </div>
  );
}

export async function generateSvg(rawStation: string, options: Options) {
  const station = getStationDetails(rawStation);
  const border = options.border || BORDER;
  return satori(<StationBadge station={station} options={options} />, {
    height: CODE_HEIGHT + border * 2,
    fonts: [{ name: "main", data: await getFont(), weight: 400, style: "normal" }],
  });
}
