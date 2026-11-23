-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "businessType" TEXT NOT NULL DEFAULT 'AC_AND_IT',
    "phone" TEXT,
    "lineOaId" TEXT,
    "botnoiBotId" TEXT,
    "webhookSecret" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- AlterTable Technician
ALTER TABLE "Technician"
    ADD COLUMN "specialty" TEXT,
    ADD COLUMN "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN "projectId" TEXT;

-- AlterTable Ticket
ALTER TABLE "Ticket"
    ADD COLUMN "source" TEXT NOT NULL DEFAULT 'WEB',
    ADD COLUMN "projectId" TEXT;

-- CreateTable SatisfactionReview
CREATE TABLE "SatisfactionReview" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "speedRating" INTEGER,
    "serviceRating" INTEGER,
    "comment" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "customerName" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SatisfactionReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable ChatConversation
CREATE TABLE "ChatConversation" (
    "id" TEXT NOT NULL,
    "externalUserId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'CHATBOT',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "summary" TEXT,
    "projectId" TEXT NOT NULL,
    "ticketId" TEXT,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable ChatLogMessage
CREATE TABLE "ChatLogMessage" (
    "id" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "senderName" TEXT,
    "text" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatLogMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");
CREATE INDEX "Project_ownerId_idx" ON "Project"("ownerId");
CREATE INDEX "Technician_projectId_idx" ON "Technician"("projectId");
CREATE INDEX "Ticket_projectId_idx" ON "Ticket"("projectId");
CREATE UNIQUE INDEX "SatisfactionReview_ticketId_key" ON "SatisfactionReview"("ticketId");
CREATE INDEX "SatisfactionReview_projectId_idx" ON "SatisfactionReview"("projectId");
CREATE INDEX "SatisfactionReview_rating_idx" ON "SatisfactionReview"("rating");
CREATE INDEX "ChatConversation_projectId_lastMessageAt_idx" ON "ChatConversation"("projectId", "lastMessageAt");
CREATE INDEX "ChatConversation_channel_idx" ON "ChatConversation"("channel");
CREATE INDEX "ChatLogMessage_conversationId_createdAt_idx" ON "ChatLogMessage"("conversationId", "createdAt");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Technician" ADD CONSTRAINT "Technician_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SatisfactionReview" ADD CONSTRAINT "SatisfactionReview_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SatisfactionReview" ADD CONSTRAINT "SatisfactionReview_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ChatLogMessage" ADD CONSTRAINT "ChatLogMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
