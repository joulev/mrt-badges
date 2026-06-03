import type { Font } from "opentype.js";
import { renderToStaticMarkup } from "react-dom/server";
import { svgCache } from "./cache";
import { getStationDetails } from "./get-station-details";
import { getLtaFont, TextPaths } from "./text-paths";
import type { Options, Station, StationCode } from "./types";

type StationCodePosition = "left" | "right" | "middle" | "single";

interface RenderMetrics {
  border: number;
  codeBorderStrokeWidth: number;
  totalHeight: number;
}

interface RenderedStationCode extends StationCode {
  key: string;
  position: StationCodePosition;
  width: number;
  x: number;
}

interface RenderedStationPart {
  key: string;
  codes: RenderedStationCode[];
  width: number;
  x: number;
}

interface StationPartConnector {
  key: string;
  leftColour: string;
  rightColour: string;
  x: number;
}

interface StationLayout {
  connectors: StationPartConnector[];
  parts: RenderedStationPart[];
  width: number;
}

const BORDER = 2;
const CODE_HEIGHT = 50;
const CODE_GAP = 4;
const CODE_BADGE_END_FIX = 2;
const FONT_SIZE = 30;
const FONT_SIZE_SM = 24;
const CODE_SEPARATOR_WIDTH = 3;
const PART_GAP = 24;
const PART_CONNECTOR_WIDTH_OFFSET = 0.5;
const PART_CONNECTOR_HEIGHT = 11;
const PART_CONNECTOR_DX = 2;
// Station code shapes are authored in this source coordinate space, then scaled to CODE_HEIGHT.
const CODE_SVG_WIDTH = 223;
const CODE_SVG_HEIGHT = 126;
const CODE_RENDER_WIDTH = (CODE_SVG_WIDTH / CODE_SVG_HEIGHT) * CODE_HEIGHT;
const INVALID_BADGE_WIDTH = 260;
// The dashed under-study outline should look the same for every ?border= value. These constants
// intentionally match the historical default for border=2 in the 223x126 source coordinate space.
const UNDER_STUDY_BORDER_STROKE_WIDTH = (BORDER * 4 * CODE_SVG_HEIGHT) / CODE_HEIGHT;
const UNDER_STUDY_BORDER_DASH = UNDER_STUDY_BORDER_STROKE_WIDTH;

function getRenderMetrics(border: number): RenderMetrics {
  // Border thickness is configured in rendered pixels, but the badge paths are drawn in
  // CODE_SVG_* coordinates; keep both spaces aligned so strokes are not clipped.
  const totalHeight = CODE_HEIGHT + border * 2;
  const codeBorderStrokeWidth = (border * 2 * CODE_SVG_HEIGHT) / CODE_HEIGHT;

  return {
    border,
    codeBorderStrokeWidth,
    totalHeight,
  };
}

function getStationCodePosition(index: number, length: number): StationCodePosition {
  // In "EW16:NE3:TE17", EW16 is left, NE3 is middle, and TE17 is right. A lone "CC24" is single.
  if (index === 0 && index === length - 1) return "single";
  if (index === 0) return "left";
  if (index === length - 1) return "right";
  return "middle";
}

function getStationCodeFillPath(position: StationCodePosition) {
  // These paths mirror the official pill shapes in the 223x126 coordinate space: rounded outer
  // ends, straight inner joins, and a rectangular middle piece for 3+ line interchanges.
  switch (position) {
    case "left":
      return "M223 126H34.825c-13.992 0-21.925-13.52-24.028-17.671C3.636 94.191 0 78.945 0 63s3.636-31.2 10.797-45.34C12.9 13.52 20.843 0 34.825 0H223v126";
    case "right":
      return "M0 0h188.177c13.981 0 21.923 13.52 24.027 17.66C219.364 31.8 223 47.056 223 63s-3.636 31.2-10.796 45.329C210.1 112.47 202.168 126 188.177 126H0z";
    case "single":
      return "M212.204 17.66C210.1 13.52 202.158 0 188.177 0H34.823C20.842 0 12.9 13.52 10.797 17.66 3.636 31.8 0 47.056 0 63s3.636 31.2 10.797 45.329C12.9 112.47 20.832 126 34.823 126h153.354c13.991 0 21.923-13.52 24.027-17.671C219.364 94.191 223 78.945 223 63s-3.636-31.2-10.796-45.34";
    case "middle":
      return "M0 63V0h223v126H0z";
  }
}

function getStationCodeBorderPath(position: StationCodePosition) {
  switch (position) {
    case "left":
      return "M223 0H34.825c-13.992 0-21.925 13.52-24.028 17.671C3.636 31.809 0 47.055 0 63s3.636 31.2 10.797 45.329C12.9 112.48 20.833 126 34.825 126H223";
    case "right":
      return "M0 0h188.177c13.981 0 21.923 13.52 24.027 17.66C219.364 31.8 223 47.056 223 63s-3.636 31.2-10.796 45.329C210.1 112.47 202.168 126 188.177 126H0";
    case "single":
      return getStationCodeFillPath(position);
    case "middle":
      return "M0 0H223M0 126H223";
  }
}

function getStationLayout(station: Station): StationLayout {
  // A single cursor lays out all parts left-to-right. Codes in a part touch, while parts separated
  // by "-" reserve PART_GAP for the tap-out connector.
  //
  // Example: "EW16:NE3-TE17" becomes two parts: [EW16, NE3] then [TE17]. The ":" codes share one
  // continuous badge group; the "-" parts get a connector between them.
  const parts: RenderedStationPart[] = [];
  const connectors: StationPartConnector[] = [];
  let cursor = 0;

  station.forEach((part, partIndex) => {
    const partX = cursor;
    let codeCursor = partX;
    const codes = part.map((code, codeIndex) => {
      const position = getStationCodePosition(codeIndex, part.length);
      const renderedCode: RenderedStationCode = {
        ...code,
        key: `${partIndex}-${code.lineCode}${code.number}-${codeIndex}`,
        position,
        width: CODE_RENDER_WIDTH,
        x: codeCursor,
      };
      const nextCode = part[codeIndex + 1];
      const separatorWidth =
        nextCode && code.colour.bg === nextCode.colour.bg ? CODE_SEPARATOR_WIDTH : 0;
      codeCursor += CODE_RENDER_WIDTH + separatorWidth;
      return renderedCode;
    });
    const width = codeCursor - partX;

    parts.push({
      key: `${partIndex}-${part.map(code => `${code.lineCode}${code.number}`).join(":")}`,
      codes,
      width,
      x: partX,
    });

    cursor = codeCursor;

    const nextPart = station[partIndex + 1];
    if (nextPart) {
      connectors.push({
        key: `${partIndex}-${partIndex + 1}`,
        leftColour: part[part.length - 1].colour.bg,
        rightColour: nextPart[0].colour.bg,
        x: cursor,
      });
      cursor += PART_GAP;
    }
  });

  return { connectors, parts, width: cursor };
}

function getStationClipIdPrefix(badgeCode: string) {
  // Under-study badges need clipPath ids. Hashing keeps ids stable for cache/debugging while
  // avoiding collisions when multiple badge SVGs are embedded in the same document.
  let hash = 0;
  for (const character of badgeCode) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return `mrt-station-${hash.toString(36)}`;
}

function getStationCodeTransform(code: RenderedStationCode, metrics: RenderMetrics) {
  // Each code shape is drawn in CODE_SVG_* coordinates, but layout widths are in rendered pixels.
  // The transform places the source path inside the border padding and always scales it to
  // CODE_HEIGHT, so ?border= changes only the stroke/padding, not the pill geometry.
  const scale = CODE_HEIGHT / CODE_SVG_HEIGHT;
  return `translate(${metrics.border + code.x} ${metrics.border}) scale(${scale})`;
}

function getStationPartConnectorGeometry(connector: StationPartConnector, metrics: RenderMetrics) {
  // The connector is two opposing coloured trapezoids, with white rails overlaid to match badge
  // borders across the tap-out gap. Its horizontal geometry uses the default border width so
  // ?border= only changes rail thickness, not rail length.
  const connectorWidth = PART_GAP + BORDER * 2 + PART_CONNECTOR_WIDTH_OFFSET * 2;
  const connectorOverhang = BORDER + PART_CONNECTOR_WIDTH_OFFSET;
  const connectorHalfWidth = connectorWidth / 2 + PART_CONNECTOR_DX;
  const connectorTop = metrics.border + CODE_HEIGHT / 2 - PART_CONNECTOR_HEIGHT / 2;
  const railTop =
    metrics.border + CODE_HEIGHT / 2 - (PART_CONNECTOR_HEIGHT + metrics.border * 2) / 2;
  const railBottom = CODE_HEIGHT / 2 + (PART_CONNECTOR_HEIGHT + metrics.border * 2) / 2;
  const rightConnectorLeft = connectorOverhang + PART_GAP / 2 - PART_CONNECTOR_DX;
  const leftClipBottom = ((connectorWidth / 2 - PART_CONNECTOR_DX) / connectorHalfWidth) * 100;
  const rightClipTop = ((PART_CONNECTOR_DX * 2) / connectorHalfWidth) * 100;
  const x = metrics.border + connector.x - connectorOverhang;

  return {
    connectorHalfWidth,
    connectorTop,
    connectorWidth,
    leftClipBottom,
    railBottom,
    railTop,
    rightClipTop,
    rightConnectorLeft,
    x,
  };
}

function StationPartConnectorRails({
  connector,
  metrics,
}: {
  connector: StationPartConnector;
  metrics: RenderMetrics;
}) {
  const { connectorWidth, railBottom, railTop, x } = getStationPartConnectorGeometry(
    connector,
    metrics,
  );

  return (
    <g transform={`translate(${x} 0)`}>
      <rect fill="white" height={metrics.border} width={connectorWidth} x="0" y={railTop} />
      <rect fill="white" height={metrics.border} width={connectorWidth} x="0" y={railBottom} />
    </g>
  );
}

function StationPartConnectorFill({
  connector,
  metrics,
}: {
  connector: StationPartConnector;
  metrics: RenderMetrics;
}) {
  const { connectorHalfWidth, connectorTop, leftClipBottom, rightClipTop, rightConnectorLeft, x } =
    getStationPartConnectorGeometry(connector, metrics);

  return (
    <g transform={`translate(${x} 0)`}>
      <path
        d={`M0 ${connectorTop} H${connectorHalfWidth} L${
          (leftClipBottom / 100) * connectorHalfWidth
        } ${connectorTop + PART_CONNECTOR_HEIGHT} H0 Z`}
        fill={connector.leftColour}
      />
      <path
        d={`M${
          rightConnectorLeft + (rightClipTop / 100) * connectorHalfWidth
        } ${connectorTop} H${rightConnectorLeft + connectorHalfWidth} V${
          connectorTop + PART_CONNECTOR_HEIGHT
        } H${rightConnectorLeft} Z`}
        fill={connector.rightColour}
      />
    </g>
  );
}

function StationCodeShape({
  clipIdPrefix,
  code,
  metrics,
}: {
  clipIdPrefix: string;
  code: RenderedStationCode;
  metrics: RenderMetrics;
}) {
  const fillPath = getStationCodeFillPath(code.position);
  const underStudyClipPathId = `${clipIdPrefix}-${code.key}-under-study-clip`;

  return (
    <g transform={getStationCodeTransform(code, metrics)}>
      {code.underStudy ? (
        <defs>
          <clipPath id={underStudyClipPathId}>
            <path d={fillPath} />
          </clipPath>
        </defs>
      ) : null}
      <path
        d={getStationCodeBorderPath(code.position)}
        fill="none"
        stroke="white"
        strokeLinecap="butt"
        strokeLinejoin="round"
        strokeWidth={metrics.codeBorderStrokeWidth}
      />
      <path d={fillPath} fill={code.underStudy ? "white" : code.colour.bg} fillRule="evenodd" />
      {code.underStudy ? (
        <path
          clipPath={`url(#${underStudyClipPathId})`}
          d={fillPath}
          fill="none"
          stroke={code.colour.bg}
          strokeDasharray={`${UNDER_STUDY_BORDER_DASH} ${UNDER_STUDY_BORDER_DASH}`}
          strokeLinecap="butt"
          strokeLinejoin="round"
          strokeWidth={UNDER_STUDY_BORDER_STROKE_WIDTH}
        />
      ) : null}
    </g>
  );
}

function StationPartShapes({
  clipIdPrefix,
  part,
  metrics,
}: {
  clipIdPrefix: string;
  part: RenderedStationPart;
  metrics: RenderMetrics;
}) {
  return (
    <g>
      {part.codes.map(code => (
        <StationCodeShape
          key={`${code.key}-shape`}
          clipIdPrefix={clipIdPrefix}
          code={code}
          metrics={metrics}
        />
      ))}
      {part.codes.map((code, index) => {
        const nextCode = part.codes[index + 1];
        if (!nextCode || code.colour.bg !== nextCode.colour.bg) return null;
        return (
          <rect
            key={`${code.key}-separator`}
            fill="white"
            height={CODE_HEIGHT}
            width={CODE_SEPARATOR_WIDTH}
            x={metrics.border + code.x + code.width}
            y={metrics.border}
          />
        );
      })}
    </g>
  );
}

function StationCodeText({
  code,
  font,
  metrics,
}: {
  code: RenderedStationCode;
  font: Font;
  metrics: RenderMetrics;
}) {
  const fontSize = code.lineCode.length + code.number.length > 4 ? FONT_SIZE_SM : FONT_SIZE;
  // "W" is too wide, so need special offset to make it still look visually centered
  // This is also performed in official LTA badges for EWL too. Not sure about JW for JRL
  const xOffset =
    code.position === "left" && code.lineCode.includes("W")
      ? CODE_BADGE_END_FIX
      : code.position === "right" && code.lineCode.includes("W")
        ? -CODE_BADGE_END_FIX
        : 0;

  return (
    <TextPaths
      colour={code.underStudy ? code.colour.bg : code.colour.fg}
      font={font}
      fontSize={fontSize}
      gap={CODE_GAP}
      height={CODE_HEIGHT}
      parts={code.number ? [code.lineCode, code.number] : [code.lineCode]}
      width={code.width}
      x={metrics.border + code.x + xOffset}
      y={metrics.border}
    />
  );
}

function StationPartText({
  font,
  metrics,
  part,
}: {
  font: Font;
  metrics: RenderMetrics;
  part: RenderedStationPart;
}) {
  return (
    <g>
      {part.codes.map(code => (
        <StationCodeText key={`${code.key}-text`} code={code} font={font} metrics={metrics} />
      ))}
    </g>
  );
}

function renderStationBadge(
  clipIdPrefix: string,
  station: Station,
  metrics: RenderMetrics,
  font: Font,
) {
  const layout = getStationLayout(station);
  const width = layout.width + metrics.border * 2;

  return renderToStaticMarkup(
    <svg
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      fill="none"
      focusable="false"
      height={metrics.totalHeight}
      viewBox={`0 0 ${width} ${metrics.totalHeight}`}
      width={width}
    >
      {layout.connectors.map(connector => (
        <StationPartConnectorRails
          key={`${connector.key}-rails`}
          connector={connector}
          metrics={metrics}
        />
      ))}
      {layout.parts.map(part => (
        <StationPartShapes
          key={`${part.key}-shapes`}
          clipIdPrefix={clipIdPrefix}
          part={part}
          metrics={metrics}
        />
      ))}
      {layout.connectors.map(connector => (
        <StationPartConnectorFill
          key={`${connector.key}-fill`}
          connector={connector}
          metrics={metrics}
        />
      ))}
      {layout.parts.map(part => (
        <StationPartText key={`${part.key}-text`} font={font} metrics={metrics} part={part} />
      ))}
    </svg>,
  );
}

function renderInvalidStationBadge(metrics: RenderMetrics, font: Font) {
  return renderToStaticMarkup(
    <svg
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      fill="none"
      focusable="false"
      height={metrics.totalHeight}
      viewBox={`0 0 ${INVALID_BADGE_WIDTH} ${metrics.totalHeight}`}
      width={INVALID_BADGE_WIDTH}
    >
      <rect fill="red" height={metrics.totalHeight} width={INVALID_BADGE_WIDTH} x="0" y="0" />
      <TextPaths
        colour="white"
        font={font}
        fontSize={16}
        height={metrics.totalHeight}
        parts={["Invalid station identifier"]}
        width={INVALID_BADGE_WIDTH}
        x={0}
      />
    </svg>,
  );
}

export async function generateSvg(rawStation: string, options: Options) {
  const border = options.border || BORDER;
  const cacheKey = `svg-v2-${rawStation}-${border}`;
  const cachedSvg = svgCache.get(cacheKey);
  if (cachedSvg) return cachedSvg;

  const metrics = getRenderMetrics(border);
  const station = getStationDetails(rawStation);
  const font = await getLtaFont();
  const svg =
    station.length > 0
      ? renderStationBadge(getStationClipIdPrefix(rawStation), station, metrics, font)
      : renderInvalidStationBadge(metrics, font);

  svgCache.set(cacheKey, svg);
  return svg;
}
