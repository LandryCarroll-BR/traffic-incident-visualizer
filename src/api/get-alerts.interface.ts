import {
  DEFAULT_ALERT_LIMIT,
  ORLANDO_BOTTOM_LEFT_COORDINATES,
  ORLANDO_TOP_RIGHT_COORDINATES,
} from "@/config/constants";
import { Schema as S } from "effect";
import { Mutable } from "effect/Types";

export const getAlertsParams: GetAlertsRequest = {
  bottomLeft: [
    ORLANDO_BOTTOM_LEFT_COORDINATES.latitude,
    ORLANDO_BOTTOM_LEFT_COORDINATES.longitude,
  ],
  topRight: [
    ORLANDO_TOP_RIGHT_COORDINATES.latitude,
    ORLANDO_TOP_RIGHT_COORDINATES.longitude,
  ],
  limit: DEFAULT_ALERT_LIMIT,
};

export const GetAlertsRequestSchema = S.Struct({
  bottomLeft: S.Tuple(S.Number, S.Number),
  topRight: S.Tuple(S.Number, S.Number),
  limit: S.Number,
});

export type GetAlertsRequest = Mutable<
  S.Schema.Type<typeof GetAlertsRequestSchema>
>;

export const GetAlertsApiRequestSchema = S.Struct({
  "bottom-left": S.String,
  "top-right": S.String,
  limit: S.String,
});

export const GetAlertsEncodedRequestSchema = S.transform(
  GetAlertsApiRequestSchema,
  GetAlertsRequestSchema,
  {
    decode: (api) => ({
      bottomLeft: api["bottom-left"].split(", ").map(Number) as [
        number,
        number,
      ],
      topRight: api["top-right"].split(", ").map(Number) as [number, number],
      limit: parseInt(api.limit, 10),
    }),
    encode: (input) => ({
      "bottom-left": `${input.bottomLeft[0]}, ${input.bottomLeft[1]}`,
      "top-right": `${input.topRight[0]}, ${input.topRight[1]}`,
      limit: String(input.limit),
    }),
  },
);

export const GetAlertsApiResponseSchema = S.mutable(
  S.Array(
    S.Struct({
      id: S.String,
      type: S.String,
      subType: S.String,
      reliability: S.Number,
      locationY: S.Number,
      locationX: S.Number,
      timestamp: S.Number,
      timestampUTC: S.String,
    }),
  ),
);
