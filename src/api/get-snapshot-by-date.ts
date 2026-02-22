import { Data, Effect } from "effect";
import { addUtcDays, startOfUtcDay } from "@/lib/date";
import { DatabaseService } from "@/services/database-service";

export const getSnapshotByDate = (date: Date) =>
  DatabaseService.pipe(
    Effect.andThen((db) => {
      const dateOnly = startOfUtcDay(date);
      const nextDay = addUtcDays(dateOnly, 1);

      return Effect.tryPromise({
        try: () =>
          db.snapshot.findFirst({
            where: {
              createdAt: {
                gte: dateOnly,
                lt: nextDay, // less than (not equal to) next day
              },
            },
            include: {
              snapshotTrafficAlerts: true,
            },
            orderBy: {
              createdAt: "desc",
            },
          }),
        catch: () => new SnapshotNotFoundError({ date }),
      });
    }),
  );

class SnapshotNotFoundError extends Data.TaggedError("SnapshotNotFoundError")<{
  date: Date;
}> {}
