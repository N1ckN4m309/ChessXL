ChessXL — PvP Server

Quick setup to run a simple relay WebSocket server and play online PvP locally.

1) Install dependencies

```bash
cd "c:/Users/Ricetti/Desktop/robe mie/ChessXL"
npm install
```

2) Start the relay server

```bash
npm start
# or: node server.js
```

3) Open `index.html` in two browser windows (or two machines). First register or login from the Account screen, then click "Start PvP".

The client now uses the default server (`ws://localhost:8080`) and requires an authenticated account to join PvP matchmaking. After logging in, clicking "Start PvP" will automatically connect to the server, enter the matchmaking queue, and begin the match once an opponent is found.

Moves are relayed via the server using a `matchId`. The server stores accounts in memory for demo purposes only.
