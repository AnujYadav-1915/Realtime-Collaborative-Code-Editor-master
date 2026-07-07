# Sync Code: Real-Time Collaborative Code Editor

A real-time collaborative code editor built using React, Node.js, and Socket.IO. Users can join isolated rooms to write, edit, and view code simultaneously with instant synchronization.

## Overview

Sync Code is designed as a monolithic full-stack application that provides a reliable real-time editing experience.

## Features

The platform provides multi-user real-time editing, live cursor and typing synchronization, room-based collaboration for isolated sessions, syntax highlighting via CodeMirror, and shareable room IDs.

## Architecture

The application runs on a straightforward and performant architecture. The Frontend is a React application utilizing Recoil for state management and CodeMirror for the editor interface. The Backend is a Node.js and Express server. Real-Time Sync is handled by Socket.IO, which manages bidirectional event-based communication between clients and the server to broadcast document changes instantly to all participants in a room.

## Setup

<pre><code>
git clone https://github.com/AnujYadav-1915/sync-code-realtime-editor.git
cd sync-code-realtime-editor
npm install
npm run server:dev
</code></pre>

In a new terminal, start the frontend:

<pre><code>
npm start
</code></pre>

## Docker

<pre><code>
docker pull anuj1915/code-editor
docker run -p 3000:3000 -p 8000:8000 anuj1915/code-editor
</code></pre>

## Environment Variables

See example.env for configuration options. Most environment variables are optional for local development, but you will need to configure ALLOWED_ORIGINS for production deployment.

## Limitations

This project is built for a single Node.js instance. It does not use Redis or a distributed pub/sub system, meaning all concurrent users for a given room must be connected to the same server process.
