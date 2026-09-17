import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

// Wraps a route handler so an unhandled exception (DB connection drop,
// programming error, ...) gets logged with context and turned into a clean
// generic 500 instead of leaking a stack trace to the client. Next.js
// already prevents a thrown error here from crashing the server process -
// this adds the structured logging Next's default handling doesn't give you.
export function withErrorLogging<Args extends unknown[]>(
  routeName: string,
  handler: (request: Request, ...args: Args) => Promise<Response>
) {
  return async (request: Request, ...args: Args): Promise<Response> => {
    try {
      return await handler(request, ...args);
    } catch (error) {
      logger.error(`Unhandled error in ${routeName}`, error, {
        method: request.method,
        url: request.url,
      });
      return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
    }
  };
}
