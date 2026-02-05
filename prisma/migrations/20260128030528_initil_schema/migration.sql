-- CreateTable
CREATE TABLE "Snapshot" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SnapshotTrafficAlert" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "trafficAlertId" TEXT NOT NULL,

    CONSTRAINT "SnapshotTrafficAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrafficAlert" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "subType" TEXT NOT NULL,
    "reliability" DOUBLE PRECISION NOT NULL,
    "locationX" DOUBLE PRECISION NOT NULL,
    "locationY" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "timestampUTC" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrafficAlert_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SnapshotTrafficAlert" ADD CONSTRAINT "SnapshotTrafficAlert_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "Snapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SnapshotTrafficAlert" ADD CONSTRAINT "SnapshotTrafficAlert_trafficAlertId_fkey" FOREIGN KEY ("trafficAlertId") REFERENCES "TrafficAlert"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
