import { DatabaseService } from "@/services/database-service";
import { Effect, Data } from "effect";

export const getSnapshotByDate = (date: Date) =>
  DatabaseService.pipe(
    Effect.andThen((db) => {
      const dateOnly = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
      );
      const nextDay = new Date(dateOnly);
      nextDay.setDate(nextDay.getDate() + 1);

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
