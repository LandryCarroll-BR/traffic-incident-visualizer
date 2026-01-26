import { env } from "@/config/env";
import { registerOTel } from "@vercel/otel";

export function register() {
  registerOTel({
    serviceName: "traffic-incident-visualizer",
    instrumentationConfig: {
      fetch: {
        propagateContextUrls: [
          env.VERCEL_PROJECT_PRODUCTION_URL,
          env.WAZE_RAPID_API_BASE_URL,
        ],
      },
    },
  });
}
