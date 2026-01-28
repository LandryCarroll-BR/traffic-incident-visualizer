import { propagation, context } from "@opentelemetry/api";

// This function injects the inbound context into the request handler
export function injectInboundContext(
  f: (request: Request) => Promise<Response>,
): (request: Request) => Promise<Response> {
  return (req) => {
    const c = propagation.extract(
      context.active(),
      Object.fromEntries(req.headers),
    );
    return context.with(c, async () => {
      return await f(req);
    });
  };
}
