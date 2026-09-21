const express = require("express");
const http = require("http");
const path = require("path");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const rooms = new Map();
const clients = new Map();

function send(ws, data) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
}

function broadcast(room, data) {
  room.players.forEach(p => send(p.ws, data));
}

function newId() {
  return Math.random().toString(36).slice(2, 9).toUpperCase();
}

function leave(ws) {
  const player = clients.get(ws);
  if (!player) return;

  const room = rooms.get(player.room);

  if (room) {
    room.players = room.players.filter(p => p.ws !== ws);
    broadcast(room, {
      type: "room",
      room: room.id,
      players: room.players.map(p => ({ id: p.id, name: p.name }))
    });
    if (!room.players.length) rooms.delete(room.id);
  }

  player.room = null;
}

wss.on("connection", ws => {
  const player = { id: newId(), name: "Player", room: null, ws };
  clients.set(ws, player);

  send(ws, { type: "connected", id: player.id });

  ws.on("message", raw => {
    try {
      const data = JSON.parse(raw.toString());

      if (data.type === "name") {
        player.name = String(data.name || "Player").trim().slice(0, 20) || "Player";
        return;
      }

      if (data.type === "create") {
        leave(ws);
        const room = { id: newId(), players: [] };
        rooms.set(room.id, room);
        room.players.push(player);
        player.room = room.id;

        send(ws, { type: "created", room: room.id });
        broadcast(room, {
          type: "room",
          room: room.id,
          players: room.players.map(p => ({ id: p.id, name: p.name }))
        });
        return;
      }

      if (data.type === "join") {
        const id = String(data.room || "").toUpperCase();
        const room = rooms.get(id);

        if (!room) {
          send(ws, { type: "error", message: "این Room وجود ندارد." });
          return;
        }

        if (room.players.length >= 2) {
          send(ws, { type: "error", message: "این Room پر است." });
          return;
        }

        leave(ws);
        room.players.push(player);
        player.room = room.id;

        broadcast(room, {
          type: "room",
          room: room.id,
          players: room.players.map(p => ({ id: p.id, name: p.name }))
        });

        if (room.players.length === 2) broadcast(room, { type: "ready" });
        return;
      }

      if (data.type === "leave") {
        leave(ws);
        return;
      }

      if (data.type === "game") {
        const room = rooms.get(player.room);
        if (!room) return;
        broadcast(room, { type: "game", from: player.id, payload: data.payload || {} });
      }
    } catch {
      send(ws, { type: "error", message: "درخواست نامعتبر است." });
    }
  });

  ws.on("close", () => leave(ws));
});

app.get("/api/status", (req, res) => {
  res.json({ online: true, rooms: rooms.size, players: clients.size });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

server.listen(PORT, () => console.log(`GameWorld running on port ${PORT}`));