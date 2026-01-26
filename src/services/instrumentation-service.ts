import { NodeSdk } from "@effect/opentelemetry";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

export const InstrumentationService = NodeSdk.layer(() => ({
  resource: { serviceName: "traffic-incident-visualizer" },
  spanProcessor: new BatchSpanProcessor(new OTLPTraceExporter()),
}));
