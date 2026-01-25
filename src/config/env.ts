import { Schema as S } from "effect";
import "dotenv/config";

const createEnv = () => {
  const EnvSchema = S.Struct({
    DATABASE_URL: S.String,
    WAZE_RAPID_API_BASE_URL: S.String,
    WAZE_RAPID_API_HOST: S.String,
    WAZE_RAPID_API_KEY: S.String,
  });

  const envVars = {
    DATABASE_URL: process.env.DATABASE_URL,
    WAZE_RAPID_API_BASE_URL: process.env.WAZE_RAPID_API_BASE_URL,
    WAZE_RAPID_API_HOST: process.env.WAZE_RAPID_API_HOST,
    WAZE_RAPID_API_KEY: process.env.WAZE_RAPID_API_KEY,
  };

  return S.decodeUnknownSync(EnvSchema)(envVars, { errors: "all" });
};

export const env = createEnv();
