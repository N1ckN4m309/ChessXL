// Matchmaking WebSocket server with simple account register/login
// Usage: node server.js
const WebSocket = require('ws');
const crypto = require('crypto');
const port = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port });

// In-memory storage (demo only)
const accounts = {}; // username -> { password }
const matchQueue = []; // array of ws waiting for match
const matches = {}; // matchId -> { w: ws, b: ws }

console.log('Matchmaking WebSocket server listening on port', port);

function tryMatch() {
  while (matchQueue.length >= 2) {
    const a = matchQueue.shift();
    const b = matchQueue.shift();
    if (!a || !b || a.readyState !== WebSocket.OPEN || b.readyState !== WebSocket.OPEN) continue;
    const matchId = (Date.now().toString(36) + Math.random().toString(36).slice(2,8));
    // randomize colors
    const assignAWhite = (Math.random() < 0.5);
    const w = assignAWhite ? a : b;
    const bws = assignAWhite ? b : a;
    matches[matchId] = { w, b: bws };
    w._matchId = matchId; w._color = 'w';
    bws._matchId = matchId; bws._color = 'b';
    try {
      w.send(JSON.stringify({ type: 'match', matchId, color: 'w', opponent: { username: bws._username || null } }));
      bws.send(JSON.stringify({ type: 'match', matchId, color: 'b', opponent: { username: w._username || null } }));
    } catch (e) {}
    console.log('Matched', w._username || '(anon)', 'vs', bws._username || '(anon)', 'matchId', matchId);
  }
}

function cleanupMatch(matchId, notifyOpponent=true) {
  const m = matches[matchId];
  if (!m) return;
  const {w,b} = m;
  delete matches[matchId];
  if (w && w.readyState === WebSocket.OPEN) {
    delete w._matchId; delete w._color;
    if (notifyOpponent) try { w.send(JSON.stringify({ type: 'opponentLeft', matchId })); } catch(e){}
  }
  if (b && b.readyState === WebSocket.OPEN) {
    delete b._matchId; delete b._color;
    if (notifyOpponent) try { b.send(JSON.stringify({ type: 'opponentLeft', matchId })); } catch(e){}
  }
}

wss.on('connection', (ws) => {
  ws.on('message', (msg) => {
    let data = null;
    try { data = JSON.parse(msg); } catch (e) { return; }
    if (!data || !data.type) return;

    if (data.type === 'register') {
      const { username, password } = data;
      if (!username || !password) { ws.send(JSON.stringify({ type: 'register', ok:false, error:'missing' })); return; }
      if (accounts[username]) { ws.send(JSON.stringify({ type: 'register', ok:false, error:'exists' })); return; }
      accounts[username] = { password };
      ws.send(JSON.stringify({ type: 'register', ok:true, username }));
      console.log('Registered user', username);
      return;
    }

    if (data.type === 'login') {
      const { username, password } = data;
      if (!username || !password) { ws.send(JSON.stringify({ type: 'login', ok:false, error:'missing' })); return; }
      const a = accounts[username];
      if (!a || a.password !== password) { ws.send(JSON.stringify({ type: 'login', ok:false, error:'invalid' })); return; }
      ws._username = username;
      ws.send(JSON.stringify({ type: 'login', ok:true, username }));
      return;
    }

    if (data.type === 'enterQueue') {
      if (!ws._username) { ws.send(JSON.stringify({ type: 'queue', ok:false, error: 'not_logged_in' })); return; }
      if (matchQueue.indexOf(ws) !== -1) { return; }
      matchQueue.push(ws);
      appendQueueSize(ws);
      tryMatch();
      return;
    }

    if (data.type === 'leaveQueue') {
      const qi = matchQueue.indexOf(ws);
      if (qi !== -1) {
        matchQueue.splice(qi, 1);
        appendQueueSize(ws);
      }
      return;
    }

    if (data.type === 'move') {
      const { matchId } = data;
      if (!matchId || !matches[matchId]) return;
      const m = matches[matchId];
      // forward to other side
      const dest = (ws === m.w) ? m.b : (ws === m.b ? m.w : null);
      if (dest && dest.readyState === WebSocket.OPEN) {
        try { dest.send(JSON.stringify(data)); } catch (e) {}
      }
      return;
    }
  });

  ws.on('close', () => {
    // remove from queue
    const qi = matchQueue.indexOf(ws);
    if (qi !== -1) matchQueue.splice(qi,1);
    // cleanup match
    if (ws._matchId) {
      cleanupMatch(ws._matchId, true);
    }
  });
});

function appendQueueSize(ws) {
  try {
    const size = matchQueue.length;
    ws.send(JSON.stringify({ type: 'queue', size }));
  } catch (e) {}
}
