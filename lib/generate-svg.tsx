import React from "react";
import satori from "satori";
import { ltaFontManager, svgCache } from "./cache";
import { getStationDetails } from "./get-station-details";
import type { Options, Station, StationCode, StationCodePart } from "./types";

// Increase this for easier development
const SCALE = 1;

const BORDER = 2 * SCALE;
const CODE_WIDTH = 84 * SCALE;
const CODE_HEIGHT = 50 * SCALE;
const CODE_GAP = 4 * SCALE;
const FONT_SIZE = 27 * SCALE;
const FONT_SIZE_SM = 24 * SCALE;
const CODE_TEXT_SHIFT_UP = 1 * SCALE;
const CODE_SEPARATOR_WIDTH = 3 * SCALE;
const PART_BORDER_RADIUS_X = 15 * SCALE;
const PART_GAP = 24 * SCALE;
const PART_CONNECTOR_WIDTH_OFFSET = 2 * SCALE;
const PART_CONNECTOR_HEIGHT = 11 * SCALE;
const PART_CONNECTOR_DX = 2 * SCALE;
const BORDER_COLOUR = "white";

function StationCodeDisplay({ code }: { code: StationCode }) {
  const fontSize = code.lineCode.length + code.number.length > 4 ? FONT_SIZE_SM : FONT_SIZE;
  const textHeight = (fontSize / 27) * 19;
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: CODE_WIDTH,
        height: CODE_HEIGHT,
        // "Under study" codes are hollow: a white interior with the line colour used for the text
        // and the dashed border (drawn in StationPartDisplay), matching the official map style.
        backgroundColor: code.underStudy ? BORDER_COLOUR : code.colour.bg,
        color: code.underStudy ? code.colour.bg : code.colour.fg,
      }}
    >
      {/* "good enough"? */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          transform: `translateY(-${CODE_TEXT_SHIFT_UP}px)`,
          gap: CODE_GAP,
          lineHeight: `${textHeight}px`,
          height: textHeight,
          fontSize,
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
}: {
  codeLeft: StationCode | undefined;
  codeRight: StationCode | undefined;
}) {
  if (!codeLeft || !codeRight) return null;
  if (codeLeft.colour.bg !== codeRight.colour.bg) return null;
  // Under study codes are standalone dashed pills, not fused into the capsule, so no separator.
  if (codeLeft.underStudy || codeRight.underStudy) return null;
  // CODE_HEIGHT (not "100%") so it lines up with the coloured cells rather than the taller
  // border box around them; the parent centres it vertically.
  return (
    <div style={{ height: CODE_HEIGHT, background: BORDER_COLOUR, width: CODE_SEPARATOR_WIDTH }} />
  );
}

function StationPartDisplay({ part, options }: { part: StationCodePart; options: Options }) {
  const border = options.border || BORDER;
  // Each code carries its own border so the style can differ across the one shared capsule: an
  // "under study" code is hollow with a dashed line-coloured border, an existing code is filled
  // with a solid white border. Codes still fuse into a single capsule — only the first code gets
  // the rounded left cap and only the last gets the rounded right cap, the rest just contribute
  // top/bottom borders, so `{CR12}:JW1` reads as one joined badge that is dashed on the CR12 half
  // and solid on the JW1 half. The radius matches the old `${PART_BORDER_RADIUS_X}px/50%`.
  const radius = `${PART_BORDER_RADIUS_X}px 50%`;
  return (
    <div
      style={{ position: "relative", display: "flex", flexDirection: "row", alignItems: "center" }}
    >
      {part.map((code, j) => {
        const style = code.underStudy ? "dashed" : "solid";
        // Under study codes draw their dashed border in the line colour; existing codes use the
        // white border that fuses them into a single capsule.
        const colour = code.underStudy ? code.colour.bg : BORDER_COLOUR;
        const roundLeft = j === 0;
        const roundRight = j === part.length - 1;
        return (
          <React.Fragment key={j}>
            <div
              style={{
                display: "flex",
                overflow: "hidden",
                borderTop: `${border}px ${style} ${colour}`,
                borderBottom: `${border}px ${style} ${colour}`,
                ...(roundLeft && {
                  borderLeft: `${border}px ${style} ${colour}`,
                  borderTopLeftRadius: radius,
                  borderBottomLeftRadius: radius,
                }),
                ...(roundRight && {
                  borderRight: `${border}px ${style} ${colour}`,
                  borderTopRightRadius: radius,
                  borderBottomRightRadius: radius,
                }),
              }}
            >
              <StationCodeDisplay code={code} />
            </div>
            <StationCodeSeparator codeLeft={part.at(j)} codeRight={part.at(j + 1)} />
          </React.Fragment>
        );
      })}
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

  // Must mirror the per-code layout in StationPartDisplay so the tap-out connectors line up with
  // the real part edges: one capsule per part (hence `border * 2` for the two end caps), each code
  // is CODE_WIDTH, plus a separator wherever two codes fuse (same colour, both existing — an under
  // study code never fuses). Reduces to the original formula when no code is under study.
  const partWidths = station.map(
    part =>
      part.reduce((width, code, i) => {
        const next = part.at(i + 1);
        const fusesWithNext =
          !!next && !code.underStudy && !next.underStudy && code.colour.bg === next.colour.bg;
        return width + CODE_WIDTH + (fusesWithNext ? CODE_SEPARATOR_WIDTH : 0);
      }, 0) +
      border * 2,
  );
  const fullWidth = partWidths.reduce((a, b) => a + b + PART_GAP, 0) - PART_GAP;

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
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

  const cacheKey = `${rawStation}-${border}`;
  const cachedSvg = svgCache.get(cacheKey);
  if (cachedSvg) return cachedSvg;

  const svg = await satori(<StationBadge station={station} options={options} />, {
    height: CODE_HEIGHT + border * 2,
    fonts: [{ name: "main", data: await ltaFontManager.getFont(), weight: 400, style: "normal" }],
  });
  svgCache.set(cacheKey, svg);
  return svg;
}
