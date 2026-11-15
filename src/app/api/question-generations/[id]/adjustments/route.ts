import { proxyGenerationStream } from "@/lib/question-bank/proxy";

export async function POST(request: Request, { params }: RouteContext<"/api/question-generations/[id]/adjustments">) {
  const { id } = await params;
  return proxyGenerationStream(request, `/question-bank/generations/${encodeURIComponent(id)}/adjustments/stream`);
}
