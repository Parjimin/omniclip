import { GenerationEvent } from "@/features/manga/types";
import { errorResponse } from "@/lib/http";
import { getGenerationJob, subscribeJobEvents } from "@/lib/runtime-store";

export const runtime = "nodejs";

function encodeEvent(event: GenerationEvent): Uint8Array {
  const line = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
  return new TextEncoder().encode(line);
}

export async function GET(
  request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params;
  const job = getGenerationJob(jobId);

  if (!job) {
    return errorResponse("Job tidak ditemukan", 404);
  }

  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return errorResponse("Unauthorized", 401);
  }

  const { getSession } = await import("@/lib/runtime-store");
  const session = getSession(job.sessionId);
  if (!session || session.userId !== userId) {
    return errorResponse("Forbidden: You do not own this job", 403);
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;

      const send = (event: GenerationEvent) => {
        if (closed) return;
        controller.enqueue(encodeEvent(event));
      };

      send({
        type: "snapshot",
        data: {
          status: job.status,
          progress: job.progress,
        },
        at: Date.now(),
      });

      for (const event of job.events) {
        send(event);
      }

      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // stream already closed
        }
      };

      const unsubscribe = subscribeJobEvents(jobId, (event) => {
        send(event);
        // Auto-close stream when job reaches terminal state
        if (event.type === "completed" || event.type === "failed") {
          close();
        }
      });

      const heartbeat = setInterval(() => {
        if (closed) return;
        controller.enqueue(new TextEncoder().encode(": heartbeat\n\n"));
      }, 15000);

      request.signal.addEventListener("abort", close);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
