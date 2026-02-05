import { DatabaseService } from "@/services/database-service";
import { Effect, Data } from "effect";

export const getSnapshotByDate = (date: Date) =>
  DatabaseService.pipe(
    Effect.andThen((db) =>
      Effect.tryPromise({
        try: () =>
          db.snapshot.findFirst({
            where: {
              createdAt: date,
            },
            include: {
              snapshotTrafficAlerts: true,
            },
          }),
        catch: () => new SnapshotNotFoundError({ date }),
      }),
    ),
  );

class SnapshotNotFoundError extends Data.TaggedError("SnapshotNotFoundError")<{
  date: Date;
}> {}
