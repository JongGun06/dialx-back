-- CreateEnum
CREATE TYPE "public"."AiMessageRole" AS ENUM ('USER', 'MODEL');

-- CreateTable
CREATE TABLE "public"."AiMessage" (
    "id" TEXT NOT NULL,
    "role" "public"."AiMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "characterId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,

    CONSTRAINT "AiMessage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."AiMessage" ADD CONSTRAINT "AiMessage_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "public"."AiCharacter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AiMessage" ADD CONSTRAINT "AiMessage_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "public"."Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
