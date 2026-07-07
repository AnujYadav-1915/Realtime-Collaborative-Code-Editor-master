# Sync Code

Sync Code is a room-based real-time collaborative code editor built with React, Node.js, Socket.IO, and CodeMirror.

I built it to understand how collaborative editing actually works beyond the frontend demo layer. The main goal was to create a smooth shared editing experience where multiple users can join the same room, see updates instantly, and work on the same code session without needing refreshes or manual sync.

## What it does

Sync Code supports a few core collaboration workflows:

- Create or join a room using a shareable room ID

- Edit code collaboratively in real time

- See live updates from other users in the same room

- Track active participants in a shared session

- Use syntax highlighting through CodeMirror

The project is designed as a single-server collaborative editor and is best viewed as a practical real-time systems project rather than a fully distributed production editor.

## Tech stack

- Frontend: React, Recoil, CodeMirror, Tailwind CSS

- Backend: Node.js, Express, Socket.IO

- Real-time communication: WebSockets via Socket.IO

- Tooling: Docker, Docker Compose

## Architecture

The application uses a simple monolithic structure:

- The React frontend handles the editor UI, room join flow, and client state.

- The Node.js + Express server manages Socket.IO events and room membership.

- Socket.IO handles event-based communication between connected clients so code updates can be broadcast to other users in the same room.

This keeps the project simple to reason about and makes it easier to understand the core collaboration flow before adding distributed infrastructure.

## Main features

- Room-based real-time collaboration

- Live editor synchronization

- Multi-user session handling

- Syntax highlighting with CodeMirror

- Shareable room IDs

- Docker-based local setup

## Local setup

Clone the repository and install dependencies:

```
git clone https://github.com/AnujYadav-1915/sync-code-realtime-editor.git
cd sync-code-realtime-editor
npm install
```

Start the backend server:

```
npm run server:dev
```

In a new terminal, start the frontend:

```
npm start
```

## Running with Docker

You can also run the project with Docker:

```
docker pull anuj1915/code-editor
docker run -p 3000:3000 -p 8000:8000 anuj1915/code-editor
```

## Environment variables

See example.env for available configuration options.

Most variables are optional for local development. For deployment, make sure values like ALLOWED_ORIGINS are configured properly.

## Limitations

A few things are intentionally simple right now:

- The project runs on a single Node.js instance

- Room state is not distributed across multiple servers

- It does not use Redis or pub/sub for horizontal scaling

- Persistence is limited compared to a production collaboration platform

## What I learned

This project helped me understand:

- how room-based real-time communication works

- how to structure WebSocket event flows cleanly

- how frontend state and backend events need to stay aligned in collaborative systems

- where simple single-instance architectures start to break down at larger scale

## Live project

- Live: realtime-collaborative-code-editor-master.onrender.com

- Repository: sync-code-realtime-editor
