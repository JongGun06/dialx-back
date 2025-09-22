-- CreateTable
CREATE TABLE "public"."AiCharacter" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "persona" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "creatorProfileId" TEXT NOT NULL,

    CONSTRAINT "AiCharacter_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."AiCharacter" ADD CONSTRAINT "AiCharacter_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "public"."Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
