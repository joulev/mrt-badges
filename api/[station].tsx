import { generateSvg } from "../lib/generate-svg";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const station = url.pathname.split("/").pop() || "";
  const border = Number.parseInt(url.searchParams.get("border") || "");

  const svg = await generateSvg(station, { border: Number.isNaN(border) ? undefined : border });
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, s-maxage=3600",
    },
  });
}

export function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  });
}

export const config = { runtime: "edge" };
