-- CreateTable
CREATE TABLE "NotificationSettings" (
    "id" UUID NOT NULL,
    "pendingChatRequests" BOOLEAN NOT NULL DEFAULT true,
    "newMessages" BOOLEAN NOT NULL DEFAULT true,
    "addToSupportsRequest" BOOLEAN NOT NULL DEFAULT true,
    "groupInvitations" BOOLEAN NOT NULL DEFAULT true,
    "groupUpdates" BOOLEAN NOT NULL DEFAULT true,
    "newMembers" BOOLEAN NOT NULL DEFAULT true,
    "newGroupMessage" BOOLEAN NOT NULL DEFAULT true,
    "newsletters" BOOLEAN NOT NULL DEFAULT false,
    "userId" UUID NOT NULL,

    CONSTRAINT "NotificationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationSettings_userId_key" ON "NotificationSettings"("userId");

-- AddForeignKey
ALTER TABLE "NotificationSettings" ADD CONSTRAINT "NotificationSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
