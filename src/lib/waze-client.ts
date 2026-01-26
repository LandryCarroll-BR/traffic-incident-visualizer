import { env } from "@/config/env";
import { HttpClient, HttpClientRequest } from "@effect/platform";
import { Context, Effect, Layer, Schedule } from "effect";

const createWazeClient = Effect.gen(function* () {
  const baseClient = yield* HttpClient.HttpClient;
  const wazeClient = baseClient.pipe(
    HttpClient.retryTransient({
      times: 3,
      schedule: Schedule.spaced("1 second"),
    }),
    HttpClient.mapRequest((request) =>
      request.pipe(
        HttpClientRequest.prependUrl(env.WAZE_RAPID_API_BASE_URL),
        HttpClientRequest.setHeaders({
          "X-RapidAPI-Host": env.WAZE_RAPID_API_HOST,
          "X-RapidAPI-Key": env.WAZE_RAPID_API_KEY,
          "Content-Type": "application/json",
        }),
      ),
    ),
  );
  return wazeClient;
});

const createWazeTestClient = Effect.gen(function* () {
  const baseClient = yield* HttpClient.HttpClient;
  const wazeTestClient = baseClient.pipe(
    HttpClient.retryTransient({
      times: 3,
      schedule: Schedule.spaced("1 second"),
    }),
    HttpClient.mapRequest((request) =>
      request.pipe(HttpClientRequest.prependUrl(`${env.BASE_URL}/api`)),
    ),
  );
  return wazeTestClient;
});

export class WazeClient extends Context.Tag("WazeClient")<
  WazeClient,
  Effect.Effect.Success<typeof createWazeClient>
>() {
  static readonly Live = Layer.effect(this, createWazeClient);
  static readonly Test = Layer.effect(this, createWazeTestClient);
}
