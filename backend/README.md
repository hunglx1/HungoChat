# Moji backend

The backend uses PostgreSQL through Prisma ORM. Node.js 20.19+ is recommended.

## PostgreSQL and environment

1. Install PostgreSQL using the installer for your operating system and start the PostgreSQL service.
2. Create a database named `moji_chat` (for example, in `psql`: `CREATE DATABASE moji_chat;`).
3. Copy `.env.example` to `.env` and set `DATABASE_URL` to the local database credentials:

   ```env
   DATABASE_URL="postgresql://postgres:your_password@localhost:5432/moji_chat?schema=public"
   ```

   URL-encode special characters in the password. Also set `ACCESS_TOKEN_SECRET`, `CLIENT_URL`, and the Cloudinary credentials. Do not commit `.env`.

## Install, migrate, and run

From `backend/`:

```sh
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

`prisma/migrations/20261109220000_init` is the initial schema migration. For an already deployed database, apply committed migrations with `npm run prisma:deploy` instead of creating a new migration.

Run the frontend from `frontend/` in a separate terminal with `npm install` and `npm run dev`. Configure its existing `VITE_API_URL` and `VITE_SOCKET_URL` values to point to this backend.

## HTTP and Socket.IO endpoints

HTTP routes (all routes except `/api/auth/*` require a bearer access token):

- Authentication: `POST /api/auth/signup`, `/signin`, `/signout`, `/refresh`
- User: `GET /api/users/me`, `GET /api/users/search`, `POST /api/users/uploadAvatar`
- Friends: `GET /api/friends`, `GET|POST /api/friends/requests`, `POST /api/friends/requests/:requestId/accept|decline`
- Conversations: `GET|POST /api/conversations`, `GET /api/conversations/:conversationId/messages`, `PATCH /api/conversations/:conversationId/seen`
- Messages: `POST /api/messages/direct`, `POST /api/messages/group`, `POST /api/messages/direct/poll`, `POST /api/messages/group/poll`, `POST /api/messages/:messageId/poll/vote`, `GET /api/messages/:messageId/file`

Chat attachments are uploaded to Cloudinary and stored on messages with their original file name, size, and MIME type. The upload limit is 10 MB per message; executable and active web-content formats are rejected. Apply database changes with `npm run prisma:deploy` in deployed environments.

Polls are stored with their choices and votes in PostgreSQL. Each participant can select one choice and change their vote; results update in real time for conversation members. Apply the `20261110130000_add_polls` migration before using polls. File downloads use the authenticated API so text documents download as attachments instead of opening inline.

Socket.IO authenticates with `handshake.auth.token`. Client event: `join-conversation`. Server events: `online-users`, `new-group`, `new-message`, and `read-message`. Direct video calls use the `call:invite`, `call:answer`, `call:decline`, `call:end`, and `call:ice-candidate` signaling events; the server verifies both users belong to the same direct conversation.

Video and audio are exchanged peer-to-peer by WebRTC, not relayed through the backend. Browsers require camera and microphone permission and a secure context (HTTPS, or localhost during development). The app uses a public STUN server for connection negotiation; production deployments should provide a TURN service for networks where direct peer connections are blocked.

## Existing data

The initial Prisma migration creates PostgreSQL tables; it does not copy existing MongoDB records. A one-time data transfer requires access to the source MongoDB database and a mapping/export plan. Do not remove the old database until that transfer has been completed and verified.
