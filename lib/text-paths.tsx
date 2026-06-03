import opentype, { type BoundingBox, type Font } from "opentype.js";
import { ltaFontManager } from "./cache";

// The official-looking badges squeeze text slightly horizontally. Apply it as an SVG transform
// after measuring the unsqueezed glyph advances so centering stays predictable.
const TEXT_X_SCALE = 0.95;

let ltaFontPromise: Promise<Font> | null = null;

export async function getLtaFont() {
  // opentype.parse is cheap-ish but still pure setup work; cache the parsed font alongside the
  // fetched ArrayBuffer from ltaFontManager so every request can reuse the same glyph tables.
  ltaFontPromise ??= ltaFontManager.getFont().then(fontData => opentype.parse(fontData));
  return ltaFontPromise;
}

// Convert labels to glyph outlines so the response SVG is independent of installed client fonts.
//
// Examples:
// - MRT codes pass split parts like ["TE", "14"] with gap=4, producing two paths with the
//   official spacing between the line code and number.
// - Error labels pass a single part like ["Invalid station identifier"], so no gap is applied.
export function TextPaths({
  colour,
  font,
  fontSize,
  gap = 0,
  height,
  parts,
  width,
  x,
  y = 0,
}: {
  colour: string;
  font: Font;
  fontSize: number;
  gap?: number;
  height: number;
  parts: string[];
  width: number;
  x: number;
  y?: number;
}) {
  const positionedParts = getPositionedTextParts(font, parts, fontSize, gap);
  const textWidth = getPositionedTextWidth(font, positionedParts, fontSize);
  const baseline = getTextBaseline(font, positionedParts, fontSize, height);
  // x/y and width describe the target badge slot. xStart shifts the whole text group so the
  // horizontally-scaled glyphs are visually centered inside that slot.
  const xStart = x + (width - textWidth * TEXT_X_SCALE) / 2;

  return (
    <g transform={`translate(${xStart} ${y}) scale(${TEXT_X_SCALE} 1)`}>
      {positionedParts.map(part => (
        <path
          key={`${part.text}-${part.x}`}
          d={font.getPath(part.text, part.x, baseline, fontSize).toPathData(1)}
          fill={colour}
        />
      ))}
    </g>
  );
}

function getPositionedTextParts(font: Font, parts: string[], fontSize: number, gap: number) {
  // OpenType gives advance widths but does not know our MRT-specific visual gap. For ["TE", "14"],
  // the "14" path starts at advance("TE") + gap; for a single ["TEL"] part, it starts at 0.
  return parts.reduce<{ text: string; x: number }[]>((result, text) => {
    const previousPart = result.at(-1);
    const previousAdvance = previousPart ? font.getAdvanceWidth(previousPart.text, fontSize) : 0;
    const previousGap = previousPart ? gap : 0;
    const x = previousPart ? previousPart.x + previousAdvance + previousGap : 0;
    result.push({ text, x });
    return result;
  }, []);
}

function getPositionedTextWidth(
  font: Font,
  parts: { text: string; x: number }[],
  fontSize: number,
) {
  // The text group width is the start of the final part plus its advance. With ["TE", "14"], this
  // includes the explicit line-code/number gap; with ["TEL"], it is just advance("TEL").
  const lastPart = parts.at(-1);
  return lastPart ? lastPart.x + font.getAdvanceWidth(lastPart.text, fontSize) : 0;
}

function getTextBaseline(
  font: Font,
  parts: { text: string; x: number }[],
  fontSize: number,
  height: number,
) {
  // OpenType paths are positioned relative to a baseline; center the actual glyph bounds inside
  // the badge height rather than relying on font ascent/descent metrics.
  //
  // Example: if "TE14" at y=0 has bounds y=-21..0 and the badge is 54px tall, the visual center is
  // -10.5. Moving the baseline to 27 - (-10.5) = 37.5 puts the glyph bounds around the badge center.
  const boxes = parts.map(part => font.getPath(part.text, part.x, 0, fontSize).getBoundingBox());
  const box = mergeBoundingBoxes(boxes);
  if (!box) return height / 2;

  return height / 2 - (box.y1 + box.y2) / 2;
}

function mergeBoundingBoxes(boxes: BoundingBox[]) {
  // Split text is rendered as multiple paths, but vertical centering must consider the combined
  // label. Otherwise a narrow number-only part could pull the baseline away from the line code.
  const [firstBox, ...otherBoxes] = boxes;
  if (!firstBox) return null;

  return otherBoxes.reduce(
    (box, nextBox) => ({
      x1: Math.min(box.x1, nextBox.x1),
      x2: Math.max(box.x2, nextBox.x2),
      y1: Math.min(box.y1, nextBox.y1),
      y2: Math.max(box.y2, nextBox.y2),
    }),
    {
      x1: firstBox.x1,
      x2: firstBox.x2,
      y1: firstBox.y1,
      y2: firstBox.y2,
    },
  );
}
