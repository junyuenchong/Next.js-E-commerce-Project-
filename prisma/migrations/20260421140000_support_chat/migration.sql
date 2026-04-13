-- Simple support chat (no websockets; use polling)

CREATE TYPE "SupportConversationStatus" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "SupportMessageSenderType" AS ENUM ('USER', 'ADMIN');

CREATE TABLE "SupportConversation" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" "SupportConversationStatus" NOT NULL DEFAULT 'OPEN',
    "subject" VARCHAR(200),
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportMessage" (
    "id" SERIAL NOT NULL,
    "conversationId" INTEGER NOT NULL,
    "senderType" "SupportMessageSenderType" NOT NULL,
    "userSenderId" INTEGER,
    "adminSenderId" INTEGER,
    "body" VARCHAR(4000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SupportConversation_userId_lastMessageAt_idx" ON "SupportConversation"("userId", "lastMessageAt");
CREATE INDEX "SupportConversation_status_lastMessageAt_idx" ON "SupportConversation"("status", "lastMessageAt");
CREATE INDEX "SupportMessage_conversationId_createdAt_idx" ON "SupportMessage"("conversationId", "createdAt");
CREATE INDEX "SupportMessage_userSenderId_idx" ON "SupportMessage"("userSenderId");
CREATE INDEX "SupportMessage_adminSenderId_idx" ON "SupportMessage"("adminSenderId");

ALTER TABLE "SupportConversation"
ADD CONSTRAINT "SupportConversation_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SupportMessage"
ADD CONSTRAINT "SupportMessage_conversationId_fkey"
FOREIGN KEY ("conversationId") REFERENCES "SupportConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SupportMessage"
ADD CONSTRAINT "SupportMessage_userSenderId_fkey"
FOREIGN KEY ("userSenderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SupportMessage"
ADD CONSTRAINT "SupportMessage_adminSenderId_fkey"
FOREIGN KEY ("adminSenderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

