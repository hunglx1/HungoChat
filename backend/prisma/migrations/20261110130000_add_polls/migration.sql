CREATE TABLE "Poll" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "question" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Poll_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PollOption" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "text" VARCHAR(160) NOT NULL,

    CONSTRAINT "PollOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PollVote" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PollVote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Poll_messageId_key" ON "Poll"("messageId");
CREATE INDEX "PollOption_pollId_idx" ON "PollOption"("pollId");
CREATE UNIQUE INDEX "PollVote_pollId_userId_key" ON "PollVote"("pollId", "userId");
CREATE INDEX "PollVote_optionId_idx" ON "PollVote"("optionId");

ALTER TABLE "Poll"
ADD CONSTRAINT "Poll_messageId_fkey"
FOREIGN KEY ("messageId") REFERENCES "Message"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PollOption"
ADD CONSTRAINT "PollOption_pollId_fkey"
FOREIGN KEY ("pollId") REFERENCES "Poll"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PollVote"
ADD CONSTRAINT "PollVote_pollId_fkey"
FOREIGN KEY ("pollId") REFERENCES "Poll"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PollVote"
ADD CONSTRAINT "PollVote_optionId_fkey"
FOREIGN KEY ("optionId") REFERENCES "PollOption"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PollVote"
ADD CONSTRAINT "PollVote_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
