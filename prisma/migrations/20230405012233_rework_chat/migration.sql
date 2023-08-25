-- CreateTable
CREATE TABLE "ChatRequest" (
    "id" UUID NOT NULL,
    "requesterId" UUID NOT NULL,
    "topic" "Topic" NOT NULL,
    "language" "Language"[] DEFAULT ARRAY['ENGLISH']::"Language"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chatId" UUID,

    CONSTRAINT "ChatRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChatRequest_chatId_key" ON "ChatRequest"("chatId");

-- AddForeignKey
ALTER TABLE "ChatRequest" ADD CONSTRAINT "ChatRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatRequest" ADD CONSTRAINT "ChatRequest_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE SET NULL ON UPDATE CASCADE;
