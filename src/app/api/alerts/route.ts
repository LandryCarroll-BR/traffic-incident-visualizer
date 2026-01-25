import { readFile } from "node:fs/promises";
import path from "node:path";

async function getTestAlerts() {
  try {
    const filePath = path.join(process.cwd(), "public", "alerts.json");
    const raw = await readFile(filePath, "utf8");

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      throw new Error("alerts.json must be a JSON array");
    }

    // Keep parity with your original typing intent:
    // Array<Record<string, unknown>> in TS -> array of plain objects in JS.
    return parsed;
  } catch (err) {
    throw new Error(
      `Failed to read/parse ./public/alerts.json: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export const GET = async () => {
  try {
    const alerts = await getTestAlerts();

    return new Response(JSON.stringify(alerts), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
