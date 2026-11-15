import { proxyGenerationStream } from "@/lib/question-bank/proxy";

export async function POST(request: Request) {
  return proxyGenerationStream(request, "/question-bank/generations/stream");
}
