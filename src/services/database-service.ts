import prisma from "@/lib/prisma";
import { Effect } from "effect";

export class DatabaseService extends Effect.Service<DatabaseService>()(
  "DatabaseService",
  {
    effect: Effect.succeed(prisma),
  },
) {}
