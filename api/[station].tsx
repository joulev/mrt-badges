import { generateSvg } from "~/lib/generate-svg";

function getStationNameFromRequest(req: Request) {
  const pathname = new URL(req.url).pathname;
  return pathname.split("/").pop() || "";
}

export async function GET(req: Request) {
  const svg = await generateSvg(getStationNameFromRequest(req));
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml" } });
}

export const config = { runtime: "edge" };
