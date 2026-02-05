/*
  Warnings:

  - You are about to drop the `_SnapshotToTrafficAlert` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `snapshotsid` to the `TrafficAlert` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "_SnapshotToTrafficAlert" DROP CONSTRAINT "_SnapshotToTrafficAlert_A_fkey";

-- DropForeignKey
ALTER TABLE "_SnapshotToTrafficAlert" DROP CONSTRAINT "_SnapshotToTrafficAlert_B_fkey";

-- AlterTable
ALTER TABLE "TrafficAlert" ADD COLUMN     "snapshotsid" TEXT NOT NULL;

-- DropTable
DROP TABLE "_SnapshotToTrafficAlert";

-- AddForeignKey
ALTER TABLE "TrafficAlert" ADD CONSTRAINT "TrafficAlert_snapshotsid_fkey" FOREIGN KEY ("snapshotsid") REFERENCES "Snapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
