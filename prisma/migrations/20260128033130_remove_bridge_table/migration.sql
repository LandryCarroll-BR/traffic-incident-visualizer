/*
  Warnings:

  - You are about to drop the `SnapshotTrafficAlert` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "SnapshotTrafficAlert" DROP CONSTRAINT "SnapshotTrafficAlert_snapshotId_fkey";

-- DropForeignKey
ALTER TABLE "SnapshotTrafficAlert" DROP CONSTRAINT "SnapshotTrafficAlert_trafficAlertId_fkey";

-- DropTable
DROP TABLE "SnapshotTrafficAlert";

-- CreateTable
CREATE TABLE "_SnapshotToTrafficAlert" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SnapshotToTrafficAlert_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_SnapshotToTrafficAlert_B_index" ON "_SnapshotToTrafficAlert"("B");

-- AddForeignKey
ALTER TABLE "_SnapshotToTrafficAlert" ADD CONSTRAINT "_SnapshotToTrafficAlert_A_fkey" FOREIGN KEY ("A") REFERENCES "Snapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SnapshotToTrafficAlert" ADD CONSTRAINT "_SnapshotToTrafficAlert_B_fkey" FOREIGN KEY ("B") REFERENCES "TrafficAlert"("id") ON DELETE CASCADE ON UPDATE CASCADE;
