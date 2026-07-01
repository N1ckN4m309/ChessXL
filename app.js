const boardElem = document.getElementById('chessboard');
const statusElem = document.getElementById('status');
const moveLogElem = document.getElementById('move-log');
const playBtn = document.getElementById('btn-play');
const promoModal = document.getElementById('promotion-modal');
const resultModal = document.getElementById('result-modal');
const resultTitle = document.getElementById('result-title');
const resultPlayAgainBtn = document.getElementById('btn-result-play-again');
const resultHomeBtn = document.getElementById('btn-result-home');
const btnBuild = document.getElementById('btn-build');
const buildPanel = document.getElementById('build-panel');
const buildboardElem = document.getElementById('buildboard');
const paletteElem = document.getElementById('palette');
const deckSelect = document.getElementById('deck-select');
const deckNameInput = document.getElementById('deck-name');
const btnSaveDeck = document.getElementById('btn-save-deck');
const btnExportDeck = document.getElementById('btn-export-deck');
const btnAddToPool = document.getElementById('btn-add-to-pool');
const btnClearBuild = document.getElementById('btn-clear-build');
const buildInstructions = document.getElementById('build-instructions');
const buildTutorial = document.getElementById('build-tutorial');
const selectedPieceIndicator = document.getElementById('selected-piece');
const homeLeaderboardBtn = document.getElementById('home-leaderboard-btn');
const btnHomeFromPlay = document.getElementById('btn-home-from-play');
const btnHomeFromBuild = document.getElementById('btn-home-from-build');
const btnHomeFromLeaderboard = document.getElementById('btn-home-from-leaderboard');
const appHeader = document.querySelector('header');
const btnStartPvP = document.getElementById('btn-start-pvp');
const btnStartAI = document.getElementById('btn-start-ai');
const btnResign = document.getElementById('btn-resign');
const btnAccount = document.getElementById('btn-account');
const userBadge = document.getElementById('user-badge');
const boardCard = document.getElementById('board-card');
const playArea = document.getElementById('play-area');
const playStatus = document.getElementById('play-status');
const homeScreen = document.getElementById('home-screen');
const playScreen = document.getElementById('play-screen');
const buildScreen = document.getElementById('build-screen');
const leaderboardScreen = document.getElementById('leaderboard-screen');
const accountScreen = document.getElementById('account-screen');
const btnHomeFromAccount = document.getElementById('btn-home-from-account');
const btnLogout = document.getElementById('btn-logout');
const accountUsernameElem = document.getElementById('account-username');

// Auth UI elements
const authModal = document.getElementById('auth-modal');
const authUsername = document.getElementById('auth-username');
const authPassword = document.getElementById('auth-password');
const authRegisterBtn = document.getElementById('auth-register');
const authLoginBtn = document.getElementById('auth-login');
const authCancelBtn = document.getElementById('auth-cancel');
const authStatus = document.getElementById('auth-status');

let buildBoard = null; // piece pool array for deck construction
let currentPaletteType = null;

let gameActive = false;
let activeMatchMode = null;
let pendingPromotion = null; // {from,to,mv,piece,targetBefore}

// piece glyphs for UI
const piecesGlyph = {
  p: '♟', s: 'S', o: '0', v: 'Δ', t: 'T', x: '✕', r: '♜', n: '♞', b: '♝', q: '♛', a: 'A', w: 'W', f: 'F', d: 'D', e: 'E', c: 'C', z: 'Z', g: 'G', y: 'Y', m: 'M', l: 'L', h: 'H', u: 'U', k: '♚',
  P: '♙', S: 'S', O: '0', V: 'Δ', T: 'T', X: '✕', R: '♖', N: '♘', B: '♗', Q: '♕', A: 'A', W: 'W', F: 'F', D: 'D', E: 'E', C: 'C', Z: 'Z', G: 'G', Y: 'Y', M: 'M', L: 'L', H: 'H', U: 'U', K: '♔'
};

// Game state
let state = {
  board: [],       // 8x8 array of piece codes or null
  turn: 'w',       // 'w' or 'b'
  castling: { w: {K: true, Q: true}, b: {K: true, Q: true} },
  enPassant: null, // {r,c} target square behind double-step pawn
};

// WebSocket PvP state
let ws = null;
let wsRoom = null;
let wsIsHost = false;
let localPvpColor = null;
let _pvpServerUrl = null;
let _pvpIsHost = false;
let _pvpReconnectAttempts = 0;
let _pvpIntentionalClose = false;
let pvpMatchId = null;
let pvpOpponent = null;
let _lastCreds = null; // {username,password}
let _pendingAuthAction = null; // 'login' or 'register'
let currentUser = null;
const DEFAULT_PVP_SERVER = 'ws://localhost:8080';
let _pvpAttempting = false;
let _pendingQueue = false;

// simple overlay for matchmaking UI
let _matchOverlayElem = null;
function showMatchOverlay(text='Searching for opponent...') {
  if (_matchOverlayElem) return;
  const ov = document.createElement('div');
  ov.id = 'pvp-match-overlay';
  ov.style.position = 'fixed';
  ov.style.left = '0'; ov.style.top = '0'; ov.style.right = '0'; ov.style.bottom = '0';
  ov.style.background = 'rgba(0,0,0,0.6)';
  ov.style.display = 'flex';
  ov.style.alignItems = 'center';
  ov.style.justifyContent = 'center';
  ov.style.zIndex = '9999';
  const box = document.createElement('div');
  box.style.background = '#fff';
  box.style.padding = '20px';
  box.style.borderRadius = '8px';
  box.style.textAlign = 'center';
  box.style.minWidth = '260px';
  const p = document.createElement('div'); p.textContent = text; p.style.marginBottom='12px';
  const btn = document.createElement('button'); btn.textContent = 'Cancel';
  btn.addEventListener('click', () => { hideMatchOverlay(); disconnectPvP(); });
  box.appendChild(p); box.appendChild(btn); ov.appendChild(box);
  document.body.appendChild(ov);
  _matchOverlayElem = ov;
}
function hideMatchOverlay() {
  if (!_matchOverlayElem) return;
  try { _matchOverlayElem.remove(); } catch(e){}
  _matchOverlayElem = null;
}

function showAuthModal() {
  if (!authModal) return;
  authModal.classList.remove('hidden');
  if (authStatus) authStatus.textContent = '';
}
function hideAuthModal() { if (!authModal) return; authModal.classList.add('hidden'); }

if (authCancelBtn) authCancelBtn.addEventListener('click', () => { hideAuthModal(); });
if (authRegisterBtn) authRegisterBtn.addEventListener('click', () => {
  const u = authUsername.value && authUsername.value.trim();
  const p = authPassword.value && authPassword.value.trim();
  if (!u || !p) { if (authStatus) authStatus.textContent = 'Enter username and password'; return; }
  _lastCreds = { username: u, password: p };
  _pendingAuthAction = 'register';
  if (authStatus) authStatus.textContent = 'Connecting and registering...';
  if (ws && ws.readyState === 1) {
    try { ws.send(JSON.stringify({ type: 'register', username: u, password: p })); } catch (e) {}
  } else {
    connectPvP(DEFAULT_PVP_SERVER, null);
  }
});
if (authLoginBtn) authLoginBtn.addEventListener('click', () => {
  const u = authUsername.value && authUsername.value.trim();
  const p = authPassword.value && authPassword.value.trim();
  if (!u || !p) { if (authStatus) authStatus.textContent = 'Enter username and password'; return; }
  _lastCreds = { username: u, password: p };
  _pendingAuthAction = 'login';
  if (authStatus) authStatus.textContent = 'Connecting and logging in...';
  if (ws && ws.readyState === 1) {
    try { ws.send(JSON.stringify({ type: 'login', username: u, password: p })); } catch (e) {}
  } else {
    connectPvP(DEFAULT_PVP_SERVER, null);
  }
});

function updateUserUI() {
  if (currentUser) {
    if (userBadge) userBadge.textContent = currentUser;
    if (btnAccount) btnAccount.textContent = 'Account';
  } else {
    if (userBadge) userBadge.textContent = 'Not signed in';
    if (btnAccount) btnAccount.textContent = 'Login / Register';
  }
}

function showAccountScreen() {
  if (!accountScreen) return;
  if (accountUsernameElem) accountUsernameElem.textContent = currentUser || '-';
  showSection(accountScreen);
  setGameBoardVisible(false);
}

if (btnAccount) btnAccount.addEventListener('click', () => {
  if (currentUser) { showAccountScreen(); }
  else { showAuthModal(); }
});
if (btnLogout) btnLogout.addEventListener('click', () => {
  currentUser = null;
  updateUserUI();
  disconnectPvP();
  showHome();
  appendMoveLog('Logged out.');
});
if (btnHomeFromAccount) btnHomeFromAccount.addEventListener('click', showHome);

// initialize user UI state
updateUserUI();

function connectPvP(serverUrl, onMatch) {
  try {
    ws = new WebSocket(serverUrl);
  } catch (e) {
    alert('WebSocket not available: ' + e.message);
    return;
  }
  _pvpServerUrl = serverUrl;
  _pvpIntentionalClose = false;
  _pvpReconnectAttempts = 0;
  ws.addEventListener('open', () => {
    appendMoveLog('PvP: connected to server.');
    if (_pendingAuthAction === 'register' && _lastCreds) {
      try { ws.send(JSON.stringify({ type: 'register', username: _lastCreds.username, password: _lastCreds.password })); } catch (e) {}
    } else if (_pendingAuthAction === 'login' && _lastCreds) {
      try { ws.send(JSON.stringify({ type: 'login', username: _lastCreds.username, password: _lastCreds.password })); } catch (e) {}
    } else if (_pendingQueue && currentUser) {
      _pendingQueue = false;
      sendEnterQueue();
    }
  });
  // notify user if connection doesn't open quickly
  setTimeout(() => {
    if (!ws || ws.readyState !== 1) {
      alert('Unable to connect to PvP server at ' + serverUrl + '. Check server and try again.');
      appendMoveLog('PvP: connection timeout');
    }
  }, 3000);
  ws.addEventListener('message', (ev) => {
    let msg = null;
    try { msg = JSON.parse(ev.data); } catch (e) { return; }
    if (!msg || !msg.type) return;
    if (msg.type === 'register') {
      if (msg.ok) {
        appendMoveLog('Registered: ' + msg.username + '. Logging in...');
        if (_pendingAuthAction === 'register' && _lastCreds) {
          _pendingAuthAction = 'login';
          if (authStatus) authStatus.textContent = 'Registration successful. Logging in...';
          try { ws.send(JSON.stringify({ type: 'login', username: _lastCreds.username, password: _lastCreds.password })); } catch (e) {}
        }
      } else {
        appendMoveLog('Register failed: ' + (msg.error || 'unknown'));
        if (authStatus) authStatus.textContent = 'Register failed: ' + (msg.error || 'unknown');
        _pendingAuthAction = null;
      }
      return;
    }
    if (msg.type === 'login') {
      if (msg.ok) {
        appendMoveLog('Login successful: ' + msg.username + '. You can now press Start PvP.');
        currentUser = msg.username;
        updateUserUI();
        hideAuthModal();
        _pendingAuthAction = null;
        if (_pendingQueue) {
          _pendingQueue = false;
          sendEnterQueue();
        }
      } else {
        appendMoveLog('Login failed: ' + (msg.error || 'invalid'));
        if (authStatus) authStatus.textContent = 'Login failed: ' + (msg.error || 'invalid');
      }
      return;
    }
    if (msg.type === 'queue') {
      appendMoveLog('Players waiting: ' + msg.size);
      return;
    }
    if (msg.type === 'match') {
      pvpMatchId = msg.matchId;
      localPvpColor = msg.color;
      pvpOpponent = (msg.opponent && msg.opponent.username) ? msg.opponent.username : null;
      appendMoveLog('Matched: you are ' + localPvpColor + (pvpOpponent ? (' vs ' + pvpOpponent) : ''));
      hideMatchOverlay();
      if (onMatch) onMatch();
      else startGame('pvp', true);
      return;
    }
    if (msg.type === 'opponentLeft') {
      appendMoveLog('Opponent disconnected.');
      // end match locally
      pvpMatchId = null; pvpOpponent = null; localPvpColor = null;
      return;
    }
    if (msg.type === 'move') {
      // ensure this belongs to our match
      if (!pvpMatchId || msg.matchId !== pvpMatchId) return;
      const from = msg.from; const to = msg.to; const mv = msg.mv; const piece = msg.piece;
      animatePieceMove({r: from.r, c: from.c}, {r: to.r, c: to.c}, piecesGlyph[piece] || piece).then(() => {
        applyMoveOnBoard(state.board, {r: from.r, c: from.c}, {r: to.r, c: to.c}, state, {simulate:false, moveMeta: mv});
        const san = formatMoveSAN(piece, {r: from.r, c: from.c}, {r: to.r, c: to.c}, mv, msg.targetBefore);
        appendMoveLog('OPP: ' + san);
        state.turn = opposite(state.turn);
        renderBoard();
        checkGameEnd();
      });
      return;
    }
  });
  ws.addEventListener('close', () => { ws = null; appendMoveLog('PvP connection closed.'); _pendingQueue = false; _scheduleReconnect(); });
  ws.addEventListener('error', (ev) => { appendMoveLog('PvP connection error.'); try { console.error('WebSocket error', ev); } catch(e){}; alert('PvP WebSocket error. See console for details.'); });
}

// enhance close handler to attempt reconnect
function _scheduleReconnect() {
  if (_pvpIntentionalClose) return;
  _pvpReconnectAttempts++;
  const delay = Math.min(30000, 1000 * Math.pow(2, Math.min(6, _pvpReconnectAttempts)));
  appendMoveLog('PvP: attempting reconnect in ' + Math.round(delay/1000) + 's');
  setTimeout(() => {
    if (_pvpServerUrl) {
      connectPvP(_pvpServerUrl, () => { appendMoveLog('PvP: reconnected'); });
    }
  }, delay);
}



function sendEnterQueue() {
  if (ws && ws.readyState === 1 && currentUser) {
    try {
      ws.send(JSON.stringify({ type: 'enterQueue' }));
      appendMoveLog('Entering PvP queue...');
      showMatchOverlay('Searching for opponent...');
    } catch (e) {
      appendMoveLog('Failed to enter queue: ' + e.message);
    }
  }
}

function disconnectPvP() {
  _pvpIntentionalClose = true;
  if (ws) try { ws.send(JSON.stringify({ type: 'leaveQueue' })); } catch (e) {}
  if (ws) try { ws.close(); } catch (e) {}
  ws = null; wsRoom = null; wsIsHost = false; localPvpColor = null;
  pvpMatchId = null; pvpOpponent = null;
  _pendingQueue = false;
}

window.addEventListener('beforeunload', () => { disconnectPvP(); });

const initialFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

// Extensible piece registry: key is lowercase type, provides move generator and optional attack-only generator
const pieceDescriptions = {
  p: 'Pawn',
  s: 'SuperPawn',
  o: 'Zero',
  v: 'Diplomat',
  t: 'Edgehog',
  j: 'Dragon',
  x: 'Dummy',
  n: 'Knight',
  b: 'Bishop',
  r: 'Rook',
  q: 'Queen',
  a: 'Amazon',
  w: 'Wazir',
  f: 'Ferz',
  d: 'Dabbaba',
  e: 'Elephant',
  c: 'Camel',
  z: 'Zebra',
  g: 'Gecko',
  y: 'Gryphon',
  m: 'Manticore',
  l: 'Lance',
  h: 'Mann',
  u: 'Centaur',
  k: 'King'
};

const pieceTips = {
  p: 'Pawn moves one square forward and captures diagonally. Use it to support your stronger pieces.',
  s: 'SuperPawn moves forward any number of squares without capture and captures diagonally forward like a bishop. It promotes on the 8th rank.',
  o: 'Zero can pass its turn by moving back to its own square. Use it to force a skip move.',
  v: 'Diplomat cannot move or be captured. It protects any adjacent friendly piece from capture.',
  t: 'Edgehog moves like a queen, but only if it starts on or lands on the edge of the board.',
  j: 'Dragon combines Knight leaps and Pawn forward moves. It can jump to tricky squares and push ahead when the path is clear.',
  x: 'Dummy has no legal moves at all. It is a stationary blocker or sacrifice piece.',
  n: 'Knight jumps in an L-shape and can hop over pieces. Great for forks and tricky attacks.',
  b: 'Bishop slides across diagonals. Keep it on long diagonals for maximum range.',
  r: 'Rook slides along ranks and files. It controls open lines and supports castling.',
  q: 'Queen combines rook and bishop moves. It is the most powerful long-range piece.',
  a: 'Amazon combines queen and knight power. It can slide or jump, making it extremely versatile.',
  w: 'Wazir moves one square orthogonally. Use it for tight control and short-range defense.',
  f: 'Ferz moves one square diagonally. It is useful for close support and diagonal coverage.',
  d: 'Dabbaba jumps two squares orthogonally, leaping over obstacles. It is a powerful jumping attacker.',
  e: 'Elephant jumps two squares diagonally. It can bypass blockers and strike from unusual angles.',
  c: 'Camel jumps three squares one way and one square the other. It bypasses blockers with extended knight power.',
  z: 'Zebra jumps three squares one way and two squares the other. It is a stretched knight that can leap over any piece.',
  g: 'Gecko jumps three squares diagonally and leaps over any intermediate piece. Known as Gecko by German chess problemists.',
  y: 'Gryphon moves one square diagonally then slides outward like a rook. It is a powerful long-range compound leaper.',
  m: 'Manticore moves one square orthogonally, then continues outward along a bishop line. It combines short stepping with long diagonal range.',
  l: 'Lance moves any number of squares directly forward. It charges straight ahead with long-range thrust.',
  h: 'Mann moves like a king but is not royal. It steps one square in any direction.',
  u: 'Centaur moves like a combination of Knight and Mann.',
  k: 'King moves one square in any direction. Protect it at all costs.'
};

const pieceRegistry = {
  p: {
    glyph: piecesGlyph.p,
    value: 1,
    generateMoves: function(board, r, c, color, state) {
      const moves = [];
      const forward = (color === 'w') ? -1 : 1;
      const startRank = (color === 'w') ? 6 : 1;
      // one forward
      if (inBounds(r+forward, c) && !board[r+forward][c]) moves.push({r:r+forward, c});
      // double
      if (r === startRank && !board[r+forward][c] && inBounds(r+2*forward, c) && !board[r+2*forward][c]) moves.push({r:r+2*forward, c, dbl:true});
      // captures
      for (const dc of [-1,1]) {
        const rr = r+forward, cc = c+dc;
        if (inBounds(rr,cc) && board[rr][cc] && !sameColor(board[rr][cc], color)) moves.push({r:rr,c:cc});
        // en-passant
        if (inBounds(rr,cc) && state.enPassant && state.enPassant.r === rr && state.enPassant.c === cc) moves.push({r:rr,c:cc,enPassant:true});
      }
      return moves;
    }
  },
  s: {
    glyph: piecesGlyph.s,
    value: 3,
    generateMoves: function(board, r, c, color) {
      const moves = [];
      const forward = (color === 'w') ? -1 : 1;
      // forward sliding moves without capture
      for (let step = 1; ; step++) {
        const rr = r + forward * step;
        if (!inBounds(rr, c) || board[rr][c]) break;
        moves.push({r: rr, c});
      }
      // diagonal forward captures like a bishop
      const diagDirs = [[forward, -1], [forward, 1]];
      for (const [dr, dc] of diagDirs) {
        for (let step = 1; ; step++) {
          const rr = r + dr * step;
          const cc = c + dc * step;
          if (!inBounds(rr, cc)) break;
          if (!board[rr][cc]) continue;
          if (!sameColor(board[rr][cc], color)) moves.push({r: rr, c: cc});
          break;
        }
      }
      return moves;
    }
  },
  o: {
    glyph: piecesGlyph.o,
    value: 5,
    generateMoves: function(board, r, c, color) {
      return [{r, c, zero:true}];
    }
  },
  v: {
    glyph: piecesGlyph.v,
    value: 5,
    generateMoves: function(board, r, c, color) {
      return [];
    }
  },
  j: {
    glyph: piecesGlyph.j,
    value: 5,
    generateMoves: function(board, r, c, color) {
      const moves = [];
      const forward = (color === 'w') ? -1 : 1;
      // pawn-style forward move
      if (inBounds(r + forward, c) && !board[r + forward][c]) {
        moves.push({r: r + forward, c});
      }
      // pawn-style diagonal captures
      for (const dc of [-1, 1]) {
        const rr = r + forward;
        const cc = c + dc;
        if (inBounds(rr, cc) && board[rr][cc] && !sameColor(board[rr][cc], color)) {
          moves.push({r: rr, c: cc});
        }
      }
      // knight jumps
      const knightDeltas = [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]];
      for (const [dr, dc] of knightDeltas) {
        const rr = r + dr, cc = c + dc;
        if (!inBounds(rr, cc)) continue;
        if (!board[rr][cc] || !sameColor(board[rr][cc], color)) moves.push({r: rr, c: cc});
      }
      return moves;
    }
  },
  t: {
    glyph: piecesGlyph.t,
    value: 9,
    generateMoves: function(board, r, c, color) {
      const moves = [];
      const onEdge = r === 0 || r === 7 || c === 0 || c === 7;
      const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
      for (const [dr, dc] of dirs) {
        let rr = r + dr, cc = c + dc;
        while (inBounds(rr, cc)) {
          if (!board[rr][cc] || !sameColor(board[rr][cc], color)) {
            if (onEdge || rr === 0 || rr === 7 || cc === 0 || cc === 7) {
              moves.push({r: rr, c: cc});
            }
          }
          if (board[rr][cc]) break;
          rr += dr; cc += dc;
        }
      }
      return moves;
    }
  },
  x: {
    glyph: piecesGlyph.x,
    value: 1,
    generateMoves: function(board, r, c, color) {
      return [];
    }
  },
  n: {
    glyph: piecesGlyph.n,
    value: 3,
    generateMoves: function(board, r, c, color) {
      const deltas = [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]];
      const moves = [];
      for (const [dr,dc] of deltas) {
        const rr=r+dr, cc=c+dc; if (!inBounds(rr,cc)) continue;
        if (!board[rr][cc] || !sameColor(board[rr][cc], color)) moves.push({r:rr,c:cc});
      }
      return moves;
    }
  },
  b: {
    glyph: piecesGlyph.b,
    value: 3,
    generateMoves: slidingGenerator([[1,1],[1,-1],[-1,1],[-1,-1]])
  },
  r: {
    glyph: piecesGlyph.r,
    value: 5,
    generateMoves: slidingGenerator([[1,0],[-1,0],[0,1],[0,-1]])
  },
  w: {
    glyph: piecesGlyph.w,
    value: 2,
    generateMoves: function(board, r, c, color) {
      const deltas = [[1,0],[-1,0],[0,1],[0,-1]];
      const moves = [];
      for (const [dr, dc] of deltas) {
        const rr = r + dr, cc = c + dc;
        if (!inBounds(rr, cc)) continue;
        if (!board[rr][cc] || !sameColor(board[rr][cc], color)) moves.push({r: rr, c: cc});
      }
      return moves;
    }
  },
  l: {
    glyph: piecesGlyph.l,
    value: 4,
    generateMoves: function(board, r, c, color) {
      const moves = [];
      const dir = (color === 'w') ? -1 : 1;
      let rr = r + dir;
      while (inBounds(rr, c)) {
        if (!board[rr][c]) {
          moves.push({r: rr, c});
          rr += dir;
          continue;
        }
        if (!sameColor(board[rr][c], color)) moves.push({r: rr, c});
        break;
      }
      return moves;
    }
  },
  h: {
    glyph: piecesGlyph.h,
    value: 4,
    generateMoves: function(board, r, c, color) {
      const moves = [];
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const rr = r + dr, cc = c + dc;
          if (!inBounds(rr, cc)) continue;
          if (!board[rr][cc] || !sameColor(board[rr][cc], color)) moves.push({r: rr, c: cc});
        }
      }
      return moves;
    }
  },
  u: {
    glyph: piecesGlyph.u,
    value: 6,
    generateMoves: function(board, r, c, color) {
      const moves = [];
      const knightDeltas = [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]];
      const kingDeltas = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
      for (const [dr, dc] of knightDeltas) {
        const rr = r + dr, cc = c + dc;
        if (!inBounds(rr, cc)) continue;
        if (!board[rr][cc] || !sameColor(board[rr][cc], color)) moves.push({r: rr, c: cc});
      }
      for (const [dr, dc] of kingDeltas) {
        const rr = r + dr, cc = c + dc;
        if (!inBounds(rr, cc)) continue;
        if (!board[rr][cc] || !sameColor(board[rr][cc], color)) moves.push({r: rr, c: cc});
      }
      return moves;
    }
  },
  m: {
    glyph: piecesGlyph.m,
    value: 5,
    generateMoves: function(board, r, c, color) {
      const orthDeltas = [[1,0],[-1,0],[0,1],[0,-1]];
      const moves = [];
      for (const [dr, dc] of orthDeltas) {
        const midR = r + dr, midC = c + dc;
        if (!inBounds(midR, midC)) continue;
        if (board[midR][midC] && sameColor(board[midR][midC], color)) continue;
        if (!board[midR][midC] || !sameColor(board[midR][midC], color)) moves.push({r: midR, c: midC});
        const dirSign = `${dr},${dc}`;
        const outward = {
          '1,0': [[1,1],[1,-1]],
          '-1,0': [[-1,1],[-1,-1]],
          '0,1': [[1,1],[-1,1]],
          '0,-1': [[1,-1],[-1,-1]]
        }[dirSign];
        for (const [br, bc] of outward) {
          let step = 1;
          while (true) {
            const rr = midR + br * step;
            const cc = midC + bc * step;
            if (!inBounds(rr, cc)) break;
            if (!board[rr][cc]) {
              moves.push({r: rr, c: cc});
              step++;
              continue;
            }
            if (!sameColor(board[rr][cc], color)) moves.push({r: rr, c: cc});
            break;
          }
        }
      }
      return moves;
    }
  },
  f: {
    glyph: piecesGlyph.m,
    value: 5,
    generateMoves: function(board, r, c, color) {
      const orthDeltas = [[1,0],[-1,0],[0,1],[0,-1]];
      const bishopDirs = [[1,1],[1,-1],[-1,1],[-1,-1]];
      const moves = [];
      for (const [dr, dc] of orthDeltas) {
        const midR = r + dr, midC = c + dc;
        if (!inBounds(midR, midC)) continue;
        if (board[midR][midC] && sameColor(board[midR][midC], color)) continue;
        if (!board[midR][midC] || !sameColor(board[midR][midC], color)) {
          // the Manticore can step to the adjacent orthogonal square first
          moves.push({r: midR, c: midC});
        }
        const dirSign = `${dr},${dc}`;
        const outward = {
          '1,0': [[1,1],[1,-1]],
          '-1,0': [[-1,1],[-1,-1]],
          '0,1': [[1,1],[-1,1]],
          '0,-1': [[1,-1],[-1,-1]]
        }[dirSign];
        for (const [br, bc] of outward) {
          let step = 1;
          while (true) {
            const rr = midR + br * step;
            const cc = midC + bc * step;
            if (!inBounds(rr, cc)) break;
            if (!board[rr][cc]) {
              moves.push({r: rr, c: cc});
              step++;
              continue;
            }
            if (!sameColor(board[rr][cc], color)) moves.push({r: rr, c: cc});
            break;
          }
        }
      }
      return moves;
    }
  },
  f: {
    glyph: piecesGlyph.f,
    value: 2,
    generateMoves: function(board, r, c, color) {
      const deltas = [[1,1],[1,-1],[-1,1],[-1,-1]];
      const moves = [];
      for (const [dr, dc] of deltas) {
        const rr = r + dr, cc = c + dc;
        if (!inBounds(rr, cc)) continue;
        if (!board[rr][cc] || !sameColor(board[rr][cc], color)) moves.push({r: rr, c: cc});
      }
      return moves;
    }
  },
  d: {
    glyph: piecesGlyph.d,
    value: 2,
    generateMoves: function(board, r, c, color) {
      const deltas = [[2,0],[-2,0],[0,2],[0,-2]];
      const moves = [];
      for (const [dr, dc] of deltas) {
        const rr = r + dr, cc = c + dc;
        if (!inBounds(rr, cc)) continue;
        if (!board[rr][cc] || !sameColor(board[rr][cc], color)) moves.push({r: rr, c: cc});
      }
      return moves;
    }
  },
  e: {
    glyph: piecesGlyph.e,
    value: 2,
    generateMoves: function(board, r, c, color) {
      const deltas = [[2,2],[2,-2],[-2,2],[-2,-2]];
      const moves = [];
      for (const [dr, dc] of deltas) {
        const rr = r + dr, cc = c + dc;
        if (!inBounds(rr, cc)) continue;
        if (!board[rr][cc] || !sameColor(board[rr][cc], color)) moves.push({r: rr, c: cc});
      }
      return moves;
    }
  },
  c: {
    glyph: piecesGlyph.c,
    value: 4,
    generateMoves: function(board, r, c, color) {
      const deltas = [[3,1],[3,-1],[-3,1],[-3,-1],[1,3],[1,-3],[-1,3],[-1,-3]];
      const moves = [];
      for (const [dr, dc] of deltas) {
        const rr = r + dr, cc = c + dc;
        if (!inBounds(rr, cc)) continue;
        if (!board[rr][cc] || !sameColor(board[rr][cc], color)) moves.push({r: rr, c: cc});
      }
      return moves;
    }
  },
  z: {
    glyph: piecesGlyph.z,
    value: 5,
    generateMoves: function(board, r, c, color) {
      const deltas = [[3,2],[3,-2],[-3,2],[-3,-2],[2,3],[2,-3],[-2,3],[-2,-3]];
      const moves = [];
      for (const [dr, dc] of deltas) {
        const rr = r + dr, cc = c + dc;
        if (!inBounds(rr, cc)) continue;
        if (!board[rr][cc] || !sameColor(board[rr][cc], color)) moves.push({r: rr, c: cc});
      }
      return moves;
    }
  },
  g: {
    glyph: piecesGlyph.g,
    value: 4,
    generateMoves: function(board, r, c, color) {
      const deltas = [[3,3],[3,-3],[-3,3],[-3,-3]];
      const moves = [];
      for (const [dr, dc] of deltas) {
        const rr = r + dr, cc = c + dc;
        if (!inBounds(rr, cc)) continue;
        if (!board[rr][cc] || !sameColor(board[rr][cc], color)) moves.push({r: rr, c: cc});
      }
      return moves;
    }
  },
  y: {
    glyph: piecesGlyph.y,
    value: 6,
    generateMoves: function(board, r, c, color) {
      const diagSteps = [[1,1],[1,-1],[-1,1],[-1,-1]];
      const rookDirs = {
        '1,1': [[0,1],[1,0]],
        '1,-1': [[0,-1],[1,0]],
        '-1,1': [[0,1],[-1,0]],
        '-1,-1': [[0,-1],[-1,0]],
      };
      const moves = [];
      for (const [dr, dc] of diagSteps) {
        const midR = r + dr, midC = c + dc;
        if (!inBounds(midR, midC)) continue;
        const dirs = rookDirs[`${dr},${dc}`];
        for (const [rrDir, ccDir] of dirs) {
          let step = 1;
          while (true) {
            const rr = midR + rrDir * step;
            const cc = midC + ccDir * step;
            if (!inBounds(rr, cc)) break;
            if (!board[rr][cc]) {
              moves.push({r: rr, c: cc});
              step++;
              continue;
            }
            if (!sameColor(board[rr][cc], color)) moves.push({r: rr, c: cc});
            break;
          }
        }
      }
      return moves;
    }
  },
  q: {
    glyph: piecesGlyph.q,
    value: 9,
    generateMoves: slidingGenerator([[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]])
  },
  a: {
    glyph: piecesGlyph.a,
    value: 12,
    generateMoves: function(board, r, c, color, state) {
      const moves = slidingGenerator([[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]])(board, r, c, color, state);
      const knightDeltas = [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]];
      for (const [dr, dc] of knightDeltas) {
        const rr = r + dr, cc = c + dc;
        if (!inBounds(rr, cc)) continue;
        if (!board[rr][cc] || !sameColor(board[rr][cc], color)) moves.push({r: rr, c: cc});
      }
      return moves;
    }
  },
  k: {
    glyph: piecesGlyph.k,
    value: 0,
    generateMoves: function(board, r, c, color, state) {
      const moves = [];
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (dr===0 && dc===0) continue; const rr=r+dr, cc=c+dc; if (!inBounds(rr,cc)) continue;
        if (!board[rr][cc] || !sameColor(board[rr][cc], color)) moves.push({r:rr,c:cc});
      }
      // castling
      const rights = state.castling[color];
      const homeRank = (color==='w')?7:0;
      if (r===homeRank && c===4) {
        // king side
        if (rights.K && !board[homeRank][5] && !board[homeRank][6] && !isSquareAttacked(board, homeRank,4, opposite(color), state) && !isSquareAttacked(board, homeRank,5, opposite(color), state) && !isSquareAttacked(board, homeRank,6, opposite(color), state)) moves.push({r:homeRank,c:6,castle:'K'});
        // queen side
        if (rights.Q && !board[homeRank][3] && !board[homeRank][2] && !board[homeRank][1] && !isSquareAttacked(board, homeRank,4, opposite(color), state) && !isSquareAttacked(board, homeRank,3, opposite(color), state) && !isSquareAttacked(board, homeRank,2, opposite(color), state)) moves.push({r:homeRank,c:2,castle:'Q'});
      }
      return moves;
    }
  }
};

function slidingGenerator(dirs) {
  return function(board, r, c, color) {
    const moves = [];
    for (const [dr,dc] of dirs) {
      let rr=r+dr, cc=c+dc;
      while (inBounds(rr,cc)) {
        if (!board[rr][cc]) { moves.push({r:rr,c:cc}); rr+=dr; cc+=dc; continue; }
        if (!sameColor(board[rr][cc], color)) moves.push({r:rr,c:cc}); break;
      }
    }
    return moves;
  }
}

function inBounds(r,c){ return r>=0 && r<8 && c>=0 && c<8; }

function sameColor(pieceOrNull, color) {
  if (!pieceOrNull) return false;
  const isWhite = (pieceOrNull === pieceOrNull.toUpperCase());
  return (color === 'w') ? isWhite : !isWhite;
}

function opposite(color){ return color==='w'?'b':'w'; }

function resetBoardFromFen(fen) {
  const rows = fen.split(' ')[0].split('/');
  state.board = [];
  for (let r = 0; r < 8; r++) {
    const row = [];
    for (const ch of rows[r]) {
      if (/[1-8]/.test(ch)) {
        const empties = parseInt(ch, 10);
        for (let i = 0; i < empties; i++) row.push(null);
      } else row.push(ch);
    }
    state.board.push(row);
  }
  state.turn = fen.split(' ')[1] === 'w' ? 'w' : 'b';
}

function createEmptyBuildBoard(){ return Array(16).fill(null); }

function renderBuildBoard(){
  if (!buildboardElem) return;
  buildboardElem.innerHTML = '';
  const totalSlots = 16;
  for (let idx = 0; idx < totalSlots; idx++) {
    const slot = document.createElement('div');
    slot.className = 'build-cell';
    const file = String.fromCharCode(97 + (idx % 8));
    const rank = idx < 8 ? '2' : '1';
    const label = document.createElement('div');
    label.className = 'slot-label';
    label.textContent = `${file}${rank}`;
    slot.appendChild(label);

    const piece = buildBoard[idx];
    if (piece) {
      const chip = document.createElement('div');
      chip.className = 'build-chip';
      chip.dataset.idx = idx;

      const glyph = document.createElement('div');
      glyph.className = 'chip-glyph';
      glyph.textContent = piecesGlyph[piece] || piece;
      chip.appendChild(glyph);

      const controls = document.createElement('div');
      controls.className = 'chip-controls';

      const btnLeft = document.createElement('button');
      btnLeft.type = 'button';
      btnLeft.className = 'chip-btn';
      btnLeft.textContent = '←';
      btnLeft.title = 'Move left';
      btnLeft.disabled = idx === 0;
      btnLeft.addEventListener('click', (e) => {
        e.stopPropagation();
        if (idx > 0) {
          [buildBoard[idx - 1], buildBoard[idx]] = [buildBoard[idx], buildBoard[idx - 1]];
          renderBuildBoard();
        }
      });
      controls.appendChild(btnLeft);

      const btnRight = document.createElement('button');
      btnRight.type = 'button';
      btnRight.className = 'chip-btn';
      btnRight.textContent = '→';
      btnRight.title = 'Move right';
      btnRight.disabled = idx === 15;
      btnRight.addEventListener('click', (e) => {
        e.stopPropagation();
        if (idx < 15) {
          [buildBoard[idx], buildBoard[idx + 1]] = [buildBoard[idx + 1], buildBoard[idx]];
          renderBuildBoard();
        }
      });
      controls.appendChild(btnRight);

      const btnRemove = document.createElement('button');
      btnRemove.type = 'button';
      btnRemove.className = 'chip-btn';
      btnRemove.textContent = '×';
      btnRemove.title = 'Remove';
      btnRemove.addEventListener('click', (e) => {
        e.stopPropagation();
        buildBoard[idx] = null;
        renderBuildBoard();
      });
      controls.appendChild(btnRemove);

      chip.appendChild(controls);
      slot.appendChild(chip);
      slot.classList.add('filled');
    } else {
      const empty = document.createElement('div');
      empty.className = 'build-empty-slot';
      empty.textContent = 'empty';
      slot.appendChild(empty);
      slot.classList.add('empty');
    }
    slot.addEventListener('click', (e) => {
      if (e.target.closest('.chip-btn')) return;
      if (buildBoard[idx]) {
        buildBoard[idx] = null;
        renderBuildBoard();
        return;
      }
      if (!currentPaletteType) {
        alert('Select a piece from the palette to place it here.');
        return;
      }
      buildBoard[idx] = currentPaletteType.toLowerCase();
      renderBuildBoard();
    });
    buildboardElem.appendChild(slot);
  }
  computeBuildStats();
}

function addSelectedPieceToPool(){
  if (!currentPaletteType) {
    alert('Select a piece from the palette first.');
    return;
  }
  const emptyIndex = buildBoard.indexOf(null);
  if (emptyIndex === -1) {
    alert('Your formation is full. Remove a piece before adding another.');
    return;
  }
  const code = currentPaletteType.toLowerCase();
  const copy = buildBoard.slice();
  copy[emptyIndex] = code;
  const stats = (function(board){ const s={count:0,value:0,king:false}; for(const p of board){ if(!p) continue; s.count++; const t = p.toLowerCase(); if(t==='k') s.king = true; if(t!=='k'){ const v = pieceRegistry[t] && typeof pieceRegistry[t].value==='number'?pieceRegistry[t].value:0; s.value += v; } } return s; })(copy);
  if (stats.count > 16) { alert('Adding this piece would exceed 16 pieces for the formation.'); return; }
  if (stats.value > 39) { alert('Adding this piece would exceed formation value 39.'); return; }
  buildBoard[emptyIndex] = code;
  renderBuildBoard();
}

function computeBuildStats(board = buildBoard){
  const stats = { count:0, value:0, king:false };
  for(const piece of board){
    if(!piece) continue;
    stats.count++;
    const type = piece.toLowerCase();
    if(type === 'k') stats.king = true;
    const val = (pieceRegistry[type] && typeof pieceRegistry[type].value === 'number') ? pieceRegistry[type].value : 0;
    if(type !== 'k') stats.value += val;
  }
  const el = document.getElementById('build-stats');
  if(el) { el.innerHTML = `Pieces: ${stats.count}, value ${stats.value}`; }
  return stats;
}

function validateBuild(board = buildBoard){
  const stats = computeBuildStats(board);
  const errors = [];
  if(stats.count > 16) errors.push('Formation has more than 16 pieces');
  if(stats.value > 39) errors.push('Formation value exceeds 39');
  if(!stats.king) errors.push('King missing from formation');
  return { ok: errors.length===0, errors };
}

function createBoardFromPool(pool){
  const whiteBoard = createBoardForSide(pool, true);
  const blackBoard = createBoardForSide(pool, false);
  return mergeBoards(whiteBoard, blackBoard);
}

function createBoardForSide(pool, isWhite = true) {
  const board = Array.from({length:8}, () => Array(8).fill(null));
  for (let idx = 0; idx < 16; idx++) {
    const piece = pool[idx];
    if (!piece) continue;
    const row = isWhite ? 6 + Math.floor(idx / 8) : Math.floor(idx / 8);
    const col = idx % 8;
    board[row][col] = isWhite ? piece.toUpperCase() : piece.toLowerCase();
  }
  return board;
}

function mergeBoards(whiteBoard, blackBoard) {
  const board = Array.from({length:8}, () => Array(8).fill(null));
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      board[r][c] = whiteBoard[r][c] || blackBoard[r][c] || null;
    }
  }
  return board;
}

function generateRandomPool({ maxPieces = 16, maxValue = 39 } = {}) {
  const values = { q: 9, r: 5, b: 3, n: 3, w: 2, f: 2, d: 2, e: 2, c: 4, z: 5, g: 4, y: 6, m: 5, l: 4, h: 4, u: 6, s: 3, v: 5, t: 9, j: 5, x: 1, p: 1 };
  const types = ['q', 'r', 'b', 'n', 'w', 'f', 'd', 'e', 'c', 'z', 'g', 'y', 'm', 'l', 'h', 'u', 's', 'v', 't', 'j', 'x', 'p'];
  const pool = ['k'];
  let totalValue = 0;

  while (pool.length < maxPieces) {
    const remainingValue = maxValue - totalValue;
    const allowed = types.filter(t => values[t] <= remainingValue);
    if (allowed.length === 0) break;
    const choice = weightedRandomChoice(allowed, allowed.map(t => 1 / values[t]));
    pool.push(choice);
    totalValue += values[choice];
  }

  while (pool.length < 16) pool.push(null);
  return pool.sort(() => Math.random() - 0.5);
}

function weightedRandomChoice(items, weights) {
  const total = weights.reduce((sum, w) => sum + w, 0);
  let value = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    value -= weights[i];
    if (value <= 0) return items[i];
  }
  return items[items.length - 1];
}

function updateSelectedPieceIndicator() {
  if (!selectedPieceIndicator) return;
  if (!currentPaletteType) {
    selectedPieceIndicator.textContent = 'Selected: none';
    if (buildTutorial) buildTutorial.textContent = 'Select a piece to see a short description of how it moves.';
    return;
  }
  const key = currentPaletteType.toLowerCase();
  const glyph = piecesGlyph[key] || currentPaletteType.toUpperCase();
  const desc = pieceDescriptions[key] || '';
  selectedPieceIndicator.textContent = `Selected: ${glyph} (${desc})`;
  if (buildTutorial) {
    const tip = pieceTips[key] || `Place the ${desc} into your build pool.`;
    buildTutorial.textContent = tip;
  }
}

function fillPalette(){
  if (!paletteElem) return;
  paletteElem.innerHTML='';
  for(const k of Object.keys(pieceRegistry)){
    const btn=document.createElement('div');
    btn.className='palette-item';
    const glyph = piecesGlyph[k.toUpperCase()]||piecesGlyph[k]||k;
    btn.textContent = glyph;
    btn.dataset.type=k;
    btn.title = pieceDescriptions[k] || k;
    const val = pieceRegistry[k] && pieceRegistry[k].value ? pieceRegistry[k].value : 0;
    const badge = document.createElement('div'); badge.className='pv'; badge.textContent = val;
    btn.appendChild(badge);
    btn.addEventListener('click', ()=>{
      currentPaletteType = k;
      [...paletteElem.children].forEach(n=>n.classList.remove('active'));
      btn.classList.add('active');
      updateSelectedPieceIndicator();
    });
    paletteElem.appendChild(btn);
  }
  updateSelectedPieceIndicator();
}

function saveDeck(name){
  if(!name) name = (deckNameInput && deckNameInput.value) || ('deck-'+Date.now());
  const v = validateBuild(buildBoard);
  if(!v.ok){ alert('Cannot save deck:\n' + v.errors.join('\n')); return; }
  const all = JSON.parse(localStorage.getItem('chessxl_decks')||'{}'); all[name] = buildBoard; localStorage.setItem('chessxl_decks', JSON.stringify(all)); loadDeckList(); alert('Saved deck: '+name);
}

function loadDeckList(){ const all = JSON.parse(localStorage.getItem('chessxl_decks')||'{}'); if (!deckSelect) return; deckSelect.innerHTML=''; const placeholder = document.createElement('option'); placeholder.value=''; placeholder.textContent='-- choose deck --'; deckSelect.appendChild(placeholder); for(const name of Object.keys(all)){ const o=document.createElement('option'); o.value=name; o.textContent = name; deckSelect.appendChild(o); } }

function loadDeck(name){ const all = JSON.parse(localStorage.getItem('chessxl_decks')||'{}'); if(!all[name]) return; const saved = all[name]; if (Array.isArray(saved) && saved.length && Array.isArray(saved[0])) { buildBoard = []; for(const row of saved){ for(const cell of row){ if(cell) buildBoard.push(cell); }} } else if (Array.isArray(saved)) { buildBoard = saved.slice(); } else { buildBoard = []; } renderBuildBoard(); }

function exportDeck(name){ const all = JSON.parse(localStorage.getItem('chessxl_decks')||'{}'); const obj = name ? { [name]: all[name] } : all; const json = JSON.stringify(obj); window.prompt('Deck JSON (copy):', json); }

function renderBoard() {
  boardElem.innerHTML = '';
  const legalForSelected = selected ? generateLegalMoves(state.board, selected.r, selected.c, state) : [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const tile = document.createElement('div');
      tile.className = 'tile ' + (((r + c) % 2 === 0) ? 'light' : 'dark');
      tile.dataset.r = r; tile.dataset.c = c;
      const piece = state.board[r][c];
      if (piece) tile.innerHTML = `<div class="piece">${piecesGlyph[piece] || piece}</div>`; else tile.innerHTML = '';
      tile.addEventListener('click', onTileClick);
      if (selected && selected.r == r && selected.c == c) tile.classList.add('selected');
      // highlight legal moves
      if (selected) {
        const selPiece = state.board[selected.r][selected.c];
        const selColor = selPiece ? (selPiece === selPiece.toUpperCase() ? 'w' : 'b') : null;
        for (const mv of legalForSelected) {
          if (mv.r === r && mv.c === c) {
            tile.classList.add('highlight');
            if (mv.enPassant || (state.board[r][c] && !sameColor(state.board[r][c], selColor))) tile.classList.add('capture');
          }
        }
      }
      boardElem.appendChild(tile);
    }
  }
  if (statusElem) statusElem.textContent = '';
}

function clearHighlights() {
  const tiles = boardElem.querySelectorAll('.tile');
  tiles.forEach(t => { t.classList.remove('selected','highlight','capture'); });
}

function getTileElement(r,c) { return boardElem.querySelector(`.tile[data-r="${r}"][data-c="${c}"]`); }

function animatePieceMove(from, to, pieceGlyph, opts={}) {
  return new Promise(resolve => {
    const startTile = getTileElement(from.r, from.c);
    const endTile = getTileElement(to.r, to.c);
    if (!startTile || !endTile) { resolve(); return; }
    const boardRect = boardElem.getBoundingClientRect();
    const startRect = startTile.getBoundingClientRect();
    const endRect = endTile.getBoundingClientRect();
    const fp = document.createElement('div');
    fp.className = 'floating-piece';
    fp.textContent = pieceGlyph;
    // append to body so transforms use viewport coords
    document.body.appendChild(fp);
    // position absolute in viewport
    fp.style.left = startRect.left + 'px';
    fp.style.top = startRect.top + 'px';
    fp.style.transform = `translate(0px,0px)`;
    // compute delta
    const dx = endRect.left - startRect.left;
    const dy = endRect.top - startRect.top;
    // hide original piece visually until animation completes
    startTile.style.opacity = '0.2';
    requestAnimationFrame(()=>{
      fp.style.transform = `translate(${dx}px, ${dy}px)`;
    });
    fp.addEventListener('transitionend', () => {
      fp.style.opacity = '0';
      startTile.style.opacity = '';
      setTimeout(()=>{ if (fp.parentNode) fp.parentNode.removeChild(fp); resolve(); }, 80);
    }, {once:true});
    // safety timeout
    setTimeout(()=>{ if (fp.parentNode) fp.parentNode.removeChild(fp); startTile.style.opacity=''; resolve(); }, 700);
  });
}

let selected = null;

function onTileClick(e) {
  if (!gameActive) return;
  const r = parseInt(e.currentTarget.dataset.r, 10);
  const c = parseInt(e.currentTarget.dataset.c, 10);
  const piece = state.board[r][c];

  // in PvP mode, disallow local interaction when it's not this client's turn
  if (activeMatchMode === 'pvp' && localPvpColor && state.turn !== localPvpColor) return;

  if (selected) {
    const from = {r: selected.r, c: selected.c};
    const moved = makeMove(from, {r,c});
    selected = null;
    renderBoard();
    return;
  }

  if (piece && sameColor(piece, state.turn)) { selected = {r,c}; renderBoard(); }
}

function generatePseudoMoves(board, r, c, state) {
  const p = board[r][c]; if (!p) return [];
  const color = (p === p.toUpperCase()) ? 'w' : 'b';
  const type = p.toLowerCase();
  const reg = pieceRegistry[type]; if (!reg) return [];
  const moves = reg.generateMoves(board, r, c, color, state) || [];
  return moves.filter(mv => {
    const targetPiece = board[mv.r] && board[mv.r][mv.c];
    if (!targetPiece) return true;
    const targetColor = (targetPiece === targetPiece.toUpperCase()) ? 'w' : 'b';
    // Diplomat itself cannot be captured and adjacent friendly pieces are protected.
    if (targetPiece.toLowerCase() === 'v') return false;
    if (hasAdjacentFriendlyDiplomat(board, mv.r, mv.c, targetColor)) return false;
    return true;
  });
}

function generateLegalMoves(board, r, c, state) {
  const pseudo = generatePseudoMoves(board, r, c, state);
  const p = board[r][c]; if (!p) return [];
  const color = (p === p.toUpperCase()) ? 'w' : 'b';
  const legal = [];
  for (const mv of pseudo) {
    const nb = cloneBoard(board);
    applyMoveOnBoard(nb, {r,c}, {r:mv.r,c:mv.c}, state, {simulate:true, moveMeta:mv});
    if (!isKingInCheck(nb, color, state)) legal.push(mv);
  }
  return legal;
}

function getAllLegalMovesForColor(board, color, stateObj) {
  const moves = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;
      const pieceColor = (piece === piece.toUpperCase()) ? 'w' : 'b';
      if (pieceColor !== color) continue;
      const legal = generateLegalMoves(board, r, c, stateObj);
      for (const mv of legal) {
        moves.push({
          from: {r, c},
          to: {r: mv.r, c: mv.c},
          mv,
          piece,
          targetBefore: board[mv.r][mv.c]
        });
      }
    }
  }
  return moves;
}

function getAIMoveScore(move) {
  let score = Math.random() * 0.1;
  if (move.targetBefore) {
    const targetType = move.targetBefore.toLowerCase();
    const value = pieceRegistry[targetType] ? pieceRegistry[targetType].value : 0;
    score += value * 10;
  }
  if (move.piece.toLowerCase() === 'p') {
    if (move.to.r === 0) score += 5;
  }
  return score;
}

function aiChooseMove() {
  const moves = getAllLegalMovesForColor(state.board, 'b', state);
  if (!moves.length) return null;
  return moves.reduce((best, move) => getAIMoveScore(move) > getAIMoveScore(best) ? move : best, moves[0]);
}

function doAIMove() {
  if (!gameActive || activeMatchMode !== 'ai' || state.turn !== 'b') return;
  const move = aiChooseMove();
  if (!move) {
    checkGameEnd();
    return;
  }
  const {from, to, mv, piece, targetBefore} = move;
  const glyph = piecesGlyph[piece] || piece;
  clearHighlights();
  animatePieceMove(from, to, glyph).then(() => {
    applyMoveOnBoard(state.board, from, to, state, {simulate:false, moveMeta: mv, promotionChar: 'q'});
    const san = formatMoveSAN(piece, from, to, mv, targetBefore);
    appendMoveLog('AI: ' + san);
    state.turn = opposite(state.turn);
    renderBoard();
    checkGameEnd();
  });
}

function makeMove(from, to) {
  const legal = generateLegalMoves(state.board, from.r, from.c, state);
  const mv = legal.find(m => m.r===to.r && m.c===to.c);
  if (!mv) return false;
  const piece = state.board[from.r][from.c];
  const targetBefore = state.board[to.r][to.c];
  // handle promotion as a two-step flow
  if (piece.toLowerCase() === 'p') {
    const color = (piece === piece.toUpperCase()) ? 'w' : 'b';
    const lastRank = (color === 'w') ? 0 : 7;
    if (to.r === lastRank) {
      // defer finalizing until user chooses promotion piece
      pendingPromotion = { from, to, mv, piece, targetBefore };
      showPromotionModal(color);
      return false; // move pending
    }
  }

  // animate then apply
  const glyph = piecesGlyph[piece] || piece;
  // clear highlights to avoid immediate re-render overwriting animation
  clearHighlights();
  animatePieceMove(from, to, glyph).then(()=>{
    applyMoveOnBoard(state.board, from, to, state, {simulate:false, moveMeta: mv});
    const san = formatMoveSAN(piece, from, to, mv, targetBefore);
    appendMoveLog(san);
    state.turn = opposite(state.turn);
    // send move to opponent when in PvP
    if (activeMatchMode === 'pvp' && ws && ws.readyState === 1 && pvpMatchId) {
      try {
        ws.send(JSON.stringify({ type: 'move', matchId: pvpMatchId, from, to, mv, piece, targetBefore }));
      } catch (e) { console.error('PvP send failed', e); }
    }
    renderBoard();
    checkGameEnd();
    if (gameActive && activeMatchMode === 'ai' && state.turn === 'b') {
      setTimeout(doAIMove, 500);
    }
  });
  return true;
}

function formatSquare(s) { const files = 'abcdefgh'; return files[s.c] + (8 - s.r); }

function formatMoveNotation(piece, from, to, mv, targetBefore) {
  const fromS = formatSquare(from); const toS = formatSquare(to);
  const isCapture = !!targetBefore || !!mv.enPassant;
  let promo = '';
  if (piece.toLowerCase() === 'p') {
    const color = (piece === piece.toUpperCase()) ? 'w' : 'b';
    const lastRank = (color === 'w') ? 0 : 7;
    if (to.r === lastRank) {
      const promoted = state.board[to.r][to.c]; promo = '=' + (promoted ? promoted.toUpperCase() : 'Q');
    }
  }
  // simple long notation
  let note = (piece.toUpperCase()) + ':' + fromS + (isCapture ? 'x' : '-') + toS + promo;
  // check or checkmate for opponent (they will be to move after this move)
  const opponentColor = opposite(state.turn);
  const inCheck = isKingInCheck(state.board, opponentColor, state);
  if (inCheck) note += '+';
  // checkmate detection - quick: does opponent have any legal move?
  let mate = true;
  for (let rr=0;rr<8;rr++) for (let cc=0;cc<8;cc++) { const p = state.board[rr][cc]; if (!p) continue; if (!sameColor(p, opponentColor)) continue; if (generateLegalMoves(state.board,rr,cc,state).length>0) { mate=false; break; } }
  if (mate && inCheck) note += '#';
  return note;
}

function appendMoveLog(text) {
  if (!moveLogElem) return;
  const li = document.createElement('li'); li.textContent = text; moveLogElem.appendChild(li); moveLogElem.scrollTop = moveLogElem.scrollHeight;
}

function formatMoveSAN(piece, from, to, mv, targetBefore) {
  // castling
  if (mv.castle === 'K') return 'O-O';
  if (mv.castle === 'Q') return 'O-O-O';
  const files = 'abcdefgh';
  const toS = files[to.c] + (8 - to.r);
  const isCapture = !!targetBefore || !!mv.enPassant;
  const pType = piece.toLowerCase();
  let san = '';
  if (pType === 'o' && from.r === to.r && from.c === to.c) {
    san = '0';
  } else if (pType === 'p' || pType === 's') {
    if (isCapture) san += files[from.c] + 'x' + toS; else san += toS;
  } else {
    const pieceLetter = piece.toUpperCase();
    // minimal disambiguation omitted for brevity
    san += pieceLetter + (isCapture ? 'x' : '') + toS;
  }
  // promotion
  if (mv.promotion) san += '=' + mv.promotion.toUpperCase();
  // check/mate for opponent
  const opponent = opposite(state.turn);
  const inCheck = isKingInCheck(state.board, opponent, state);
  let mate = true;
  for (let r=0;r<8;r++) for (let c=0;c<8;c++) { const p = state.board[r][c]; if (!p) continue; if (!sameColor(p, opponent)) continue; if (generateLegalMoves(state.board,r,c,state).length>0) { mate=false; break; } }
  if (inCheck) san += mate ? '#' : '+';
  return san;
}

function applyMoveOnBoard(board, from, to, stateObj, opts={}) {
  // opts.simulate: do not mutate stateObj fields like enPassant/castling when true
  const mv = {from, to};
  const piece = board[from.r][from.c];
  const target = board[to.r][to.c];
  const color = (piece === piece.toUpperCase()) ? 'w' : 'b';

  // handle Zero self-return move as a pass turn
  if (from.r === to.r && from.c === to.c) {
    if (!opts.simulate) {
      stateObj.enPassant = null;
    }
    return;
  }

  // handle en-passant capture
  if (piece.toLowerCase() === 'p' && stateObj.enPassant && to.r === stateObj.enPassant.r && to.c === stateObj.enPassant.c && !target) {
    const pawnRow = (color === 'w') ? to.r+1 : to.r-1;
    board[pawnRow][to.c] = null;
  }

  // handle castling rook movement
  let castleType = null;
  if (piece.toLowerCase() === 'k' && Math.abs(to.c - from.c) === 2) {
    castleType = (to.c === 6) ? 'K' : 'Q';
    const home = (color === 'w') ? 7 : 0;
    if (castleType === 'K') { board[home][5] = board[home][7]; board[home][7] = null; }
    else { board[home][3] = board[home][0]; board[home][0] = null; }
  }

  // move piece
  board[to.r][to.c] = board[from.r][from.c];
  board[from.r][from.c] = null;

  // promotion
  if (piece.toLowerCase() === 'p' || piece.toLowerCase() === 's') {
    const lastRank = (color === 'w') ? 0 : 7;
    if (to.r === lastRank) {
      // promotion: use provided choice in opts.promotionChar when available (for UI), otherwise prompt or default to q
      let choice = opts.promotionChar || (opts.simulate ? 'q' : null);
      if (!choice) choice = (window.prompt('Promote to (q,r,b,n):','q') || 'q').toLowerCase();
      const map = {q:'q', r:'r', b:'b', n:'n'};
      const newType = map[choice] || 'q';
      board[to.r][to.c] = (color === 'w') ? newType.toUpperCase() : newType;
      // annotate move meta
      if (opts && opts.moveMeta) opts.moveMeta.promotion = newType;
    }
  }

  // update enPassant
  if (!opts.simulate) {
    stateObj.enPassant = null;
    if (piece.toLowerCase() === 'p' && Math.abs(to.r - from.r) === 2) {
      const epRow = (from.r + to.r)/2; stateObj.enPassant = {r: epRow, c: from.c};
    }
    // update castling rights
    if (piece === 'K') stateObj.castling.w.K = stateObj.castling.w.Q = false;
    if (piece === 'k') stateObj.castling.b.K = stateObj.castling.b.Q = false;
    if (piece === 'R') { if (from.r===7 && from.c===0) stateObj.castling.w.Q = false; if (from.r===7 && from.c===7) stateObj.castling.w.K = false; }
    if (piece === 'r') { if (from.r===0 && from.c===0) stateObj.castling.b.Q = false; if (from.r===0 && from.c===7) stateObj.castling.b.K = false; }
    // if rook is captured update rights
    if (target === 'R') { if (to.r===7 && to.c===0) stateObj.castling.w.Q = false; if (to.r===7 && to.c===7) stateObj.castling.w.K = false; }
    if (target === 'r') { if (to.r===0 && to.c===0) stateObj.castling.b.Q = false; if (to.r===0 && to.c===7) stateObj.castling.b.K = false; }
  }
}

function cloneBoard(board) { return board.map(r=>r.slice()); }

function hasAdjacentFriendlyDiplomat(board, tr, tc, color) {
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const rr = tr + dr, cc = tc + dc;
      if (!inBounds(rr, cc)) continue;
      const p = board[rr][cc]; if (!p) continue;
      const pColor = (p === p.toUpperCase()) ? 'w' : 'b';
      if (pColor === color && p.toLowerCase() === 'v') return true;
    }
  }
  return false;
}

function isSquareAttacked(board, tr, tc, byColor, stateObj) {
  // iterate all pieces of byColor and see if they can attack tr,tc (attack patterns)
  for (let r=0;r<8;r++) for (let c=0;c<8;c++) {
    const p = board[r][c]; if (!p) continue;
    const color = (p === p.toUpperCase()) ? 'w' : 'b'; if (color!==byColor) continue;
    const type = p.toLowerCase();
    const forward = (color==='w')?-1:1;
    if (type==='p') {
      for (const dc of [-1,1]) { const rr=r+forward, cc=c+dc; if (rr===tr && cc===tc) return true; }
    } else if (type==='n') {
      const deltas=[[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]];
      for (const [dr,dc] of deltas) if (r+dr===tr && c+dc===tc) return true;
    } else if (type==='b' || type==='q' || type==='r') {
      const dirs = (type==='b')?[[1,1],[1,-1],[-1,1],[-1,-1]]:(type==='r')?[[1,0],[-1,0],[0,1],[0,-1]]:[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
      for (const [dr,dc] of dirs) { let rr=r+dr, cc=c+dc; while(inBounds(rr,cc)){ if (rr===tr && cc===tc) return true; if (board[rr][cc]) break; rr+=dr; cc+=dc; } }
    } else if (type==='k' || type==='h') {
      if (Math.max(Math.abs(r-tr), Math.abs(c-tc))===1) return true;
    } else if (type==='w') {
      const deltas = [[1,0],[-1,0],[0,1],[0,-1]];
      for (const [dr,dc] of deltas) if (r+dr===tr && c+dc===tc) return true;
    } else if (type==='f') {
      const deltas = [[1,1],[1,-1],[-1,1],[-1,-1]];
      for (const [dr,dc] of deltas) if (r+dr===tr && c+dc===tc) return true;
    } else if (type==='d') {
      const deltas=[[2,0],[-2,0],[0,2],[0,-2]];
      for (const [dr,dc] of deltas) if (r+dr===tr && c+dc===tc) return true;
    } else if (type==='e') {
      const deltas=[[2,2],[2,-2],[-2,1],[-2,-2]];
      for (const [dr,dc] of deltas) if (r+dr===tr && c+dc===tc) return true;
    } else if (type==='c') {
      const deltas=[[3,1],[3,-1],[-3,1],[-3,-1],[1,3],[1,-3],[-1,3],[-1,-3]];
      for (const [dr,dc] of deltas) if (r+dr===tr && c+dc===tc) return true;
    } else if (type==='z') {
      const deltas=[[3,2],[3,-2],[-3,2],[-3,-2],[2,3],[2,-3],[-2,3],[-2,-3]];
      for (const [dr,dc] of deltas) if (r+dr===tr && c+dc===tc) return true;
    } else if (type==='g') {
      const deltas=[[3,3],[3,-3],[-3,3],[-3,-3]];
      for (const [dr,dc] of deltas) if (r+dr===tr && c+dc===tc) return true;
    } else if (type==='u') {
      const deltas=[[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2],[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
      for (const [dr,dc] of deltas) if (r+dr===tr && c+dc===tc) return true;
    } else if (type==='a') {
      const knightDeltas=[[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]];
      for (const [dr,dc] of knightDeltas) if (r+dr===tr && c+dc===tc) return true;
      const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
      for (const [dr,dc] of dirs) { let rr=r+dr, cc=c+dc; while(inBounds(rr,cc)){ if (rr===tr && cc===tc) return true; if (board[rr][cc]) break; rr+=dr; cc+=dc; } }
    } else if (type==='y') {
      const diagSteps = [[1,1],[1,-1],[-1,1],[-1,-1]];
      const rookDirs = {
        '1,1': [[0,1],[1,0]],
        '1,-1': [[0,-1],[1,0]],
        '-1,1': [[0,1],[-1,0]],
        '-1,-1': [[0,-1],[-1,0]]
      };
      for (const [dr,dc] of diagSteps) {
        const midR=r+dr, midC=c+dc;
        if (!inBounds(midR,midC)) continue;
        const dirs = rookDirs[`${dr},${dc}`];
        for (const [rrDir,ccDir] of dirs) {
          let rr=midR+rrDir, cc=midC+ccDir;
          while(inBounds(rr,cc)) {
            if (rr===tr && cc===tc) return true;
            if (board[rr][cc]) break;
            rr += rrDir; cc += ccDir;
          }
        }
      }
    } else if (type==='m') {
      const orthDirs = [[1,0],[-1,0],[0,1],[0,-1]];
      for (const [dr,dc] of orthDirs) {
        const midR=r+dr, midC=c+dc;
        if (!inBounds(midR,midC)) continue;
        const bishopDirs = (dr!==0) ? [[1,1],[1,-1],[-1,1],[-1,-1]] : [[1,1],[1,-1],[-1,1],[-1,-1]];
        for (const [br,bc] of bishopDirs) {
          let rr=midR+br, cc=midC+bc;
          while(inBounds(rr,cc)) {
            if (rr===tr && cc===tc) return true;
            if (board[rr][cc]) break;
            rr += br; cc += bc;
          }
        }
      }
    } else if (type==='l') {
      let rr=r+forward, cc=c;
      while(inBounds(rr,cc)) {
        if (rr===tr && cc===tc) return true;
        if (board[rr][cc]) break;
        rr += forward;
      }
    } else if (type==='s') {
      const diagDirs = [[forward,-1],[forward,1]];
      for (const [dr,dc] of diagDirs) {
        let rr=r+dr, cc=c+dc;
        while(inBounds(rr,cc)) {
          if (rr===tr && cc===tc) return true;
          if (board[rr][cc]) break;
          rr += dr; cc += dc;
        }
      }
    } else if (type==='j') {
      if (inBounds(r+forward,c) && !board[r+forward][c] && r+forward===tr && c===tc) return true;
      for (const dc of [-1,1]) {
        const rr=r+forward, cc=c+dc;
        if (rr===tr && cc===tc && inBounds(rr,cc) && board[rr][cc] && !sameColor(board[rr][cc], color)) return true;
      }
      const knightDeltas=[[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]];
      for (const [dr,dc] of knightDeltas) if (r+dr===tr && c+dc===tc) return true;
    }
  }
  return false;
}

function findKing(board, color) {
  const k = (color==='w')?'K':'k'; for (let r=0;r<8;r++) for (let c=0;c<8;c++) if (board[r][c]===k) return {r,c};
  return null;
}

function isKingInCheck(board, color, stateObj) {
  const king = findKing(board, color); if (!king) return true; return isSquareAttacked(board, king.r, king.c, opposite(color), stateObj);
}

function showResultModal(winner, isDraw = false) {
  if (!resultModal || !resultTitle) return;
  if (isDraw) {
    resultTitle.textContent = 'Draw!';
    const copy = resultModal.querySelector('.result-copy');
    if (copy) copy.textContent = 'The game ended in a stalemate. No one wins this round.';
  } else {
    resultTitle.textContent = `${winner} wins!`;
    const copy = resultModal.querySelector('.result-copy');
    if (copy) copy.textContent = `Checkmate! ${winner} has won the match.`;
  }
  resultModal.classList.remove('hidden');
}

function hideResultModal() {
  if (!resultModal) return;
  resultModal.classList.add('hidden');
}

function checkGameEnd() {
  // checkmate/stalemate detection
  const color = state.turn;
  for (let r=0;r<8;r++) for (let c=0;c<8;c++) {
    const p = state.board[r][c]; if (!p) continue; if (!sameColor(p,color)) continue;
    const moves = generateLegalMoves(state.board, r, c, state);
    if (moves.length>0) return; // has legal move
  }
  // no legal moves
  const isCheckmate = isKingInCheck(state.board, color, state);
  const winner = isCheckmate ? (opposite(color) === 'w' ? 'White' : 'Black') : null;
  if (isCheckmate) {
    showResultModal(winner);
    appendMoveLog(`${winner} wins by checkmate.`);
  } else {
    showResultModal('', true);
    appendMoveLog('Game ended in stalemate.');
  }
  // stop game and switch Play button to REPLAY
  gameActive = false;
  if (playBtn) playBtn.textContent = 'REPLAY';
}

function setGameBoardVisible(visible) {
  if (boardCard) boardCard.classList.toggle('hidden', !visible);
  if (document.getElementById('sidebar')) document.getElementById('sidebar').classList.toggle('hidden', !visible);
}

function showSection(section) {
  [homeScreen, playScreen, buildScreen, leaderboardScreen].forEach(sec => {
    if (!sec) return;
    const visible = sec === section;
    sec.classList.toggle('hidden', !visible);
    sec.style.display = visible ? 'block' : 'none';
  });
}

function showHome() {
  if (appHeader) appHeader.style.display = 'block';
  showSection(homeScreen);
  setGameBoardVisible(false);
  if (playArea) playArea.classList.add('hidden');
  if (playStatus) playStatus.textContent = 'No active match. Choose a mode to begin.';
}

function showPlay() {
  if (appHeader) appHeader.style.display = 'none';
  showSection(playScreen);
  if (playArea) playArea.classList.toggle('hidden', !gameActive);
  if (playStatus) playStatus.textContent = gameActive ? 'Match in progress.' : 'No active match. Choose a mode to begin.';
}

function showBuild() {
  if (appHeader) appHeader.style.display = 'none';
  showSection(buildScreen);
  if (buildPanel) buildPanel.classList.remove('hidden');
  setGameBoardVisible(false);
}

function showLeaderboard() {
  if (appHeader) appHeader.style.display = 'none';
  showSection(leaderboardScreen);
  setGameBoardVisible(false);
}

function startGame(mode, resumed=false) {
  activeMatchMode = mode;
  // PvP flow: if not resumed, prompt for server, connect and authenticate for matchmaking
  if (mode === 'pvp' && !resumed) {
    // require user to login/register before matchmaking
    showAuthModal();
    return;
  }
  const hasBuildPieces = Array.isArray(buildBoard) && buildBoard.some(p => p !== null);
  if (mode === 'ai' && hasBuildPieces) {
    const valid = validateBuild(buildBoard);
    if (!valid.ok) { alert('Cannot start game:\n' + valid.errors.join('\n')); return; }
    const whiteBoard = createBoardForSide(buildBoard, true);
    const aiPool = generateRandomPool();
    const blackBoard = createBoardForSide(aiPool, false);
    state.board = mergeBoards(whiteBoard, blackBoard);
  } else if (buildScreen && !buildScreen.classList.contains('hidden') && hasBuildPieces) {
    const valid = validateBuild(buildBoard);
    if (!valid.ok) { alert('Cannot start game:\n' + valid.errors.join('\n')); return; }
    state.board = createBoardFromPool(buildBoard);
  } else {
    resetBoardFromFen(initialFen);
  }
  state.turn = 'w';
  state.castling = { w: {K: true, Q: true}, b: {K: true, Q: true} };
  state.enPassant = null;
  if (moveLogElem) moveLogElem.innerHTML = '';
  gameActive = true;
  pendingPromotion = null;
  if (playBtn) playBtn.textContent = 'PLAY';
  setGameBoardVisible(true);
  if (playArea) playArea.classList.remove('hidden');
  if (playStatus) playStatus.textContent = 'Match in progress.';
  renderBoard();
  appendMoveLog('Match type: ' + (mode === 'ai' ? 'AI' : 'PvP'));
  showPlay();
  if (activeMatchMode === 'ai' && state.turn === 'b') {
    setTimeout(doAIMove, 500);
  }
}

resetBoardFromFen(initialFen);
renderBoard();

// initialize build board and UI
buildBoard = createEmptyBuildBoard();
fillPalette();
loadDeckList();
renderBuildBoard();
showHome();

if (playBtn) playBtn.addEventListener('click', showPlay);
if (btnBuild) btnBuild.addEventListener('click', showBuild);
if (homeLeaderboardBtn) homeLeaderboardBtn.addEventListener('click', showLeaderboard);
if (btnHomeFromPlay) btnHomeFromPlay.addEventListener('click', showHome);
if (btnHomeFromBuild) btnHomeFromBuild.addEventListener('click', showHome);
if (btnHomeFromLeaderboard) btnHomeFromLeaderboard.addEventListener('click', showHome);
if (btnStartPvP) btnStartPvP.addEventListener('click', () => {
  if (!currentUser) {
    if (authStatus) authStatus.textContent = 'Please login or register first.';
    showAuthModal();
    return;
  }
  if (!ws || ws.readyState !== 1) {
    showMatchOverlay('Connecting to server...');
    _pendingQueue = true;
    connectPvP(DEFAULT_PVP_SERVER, null);
    return;
  }
  sendEnterQueue();
});
if (btnStartAI) btnStartAI.addEventListener('click', () => startGame('ai'));
if (btnResign) btnResign.addEventListener('click', () => {
  if (!gameActive) return;
  if (confirm('Are you sure you want to resign?')) {
    appendMoveLog('Player resigned.');
    gameActive = false;
    showHome();
  }
});

// Promotion modal handlers
if (promoModal) {
  promoModal.querySelectorAll('button[data-piece]').forEach(btn => {
    btn.addEventListener('click', () => {
      const pieceChar = btn.dataset.piece;
      if (!pendingPromotion) return;
      const {from,to,mv,piece,targetBefore} = pendingPromotion;
      // animate promotion move then finalize
      const glyph = piecesGlyph[piece] || piece;
      clearHighlights();
      animatePieceMove(from, to, glyph).then(()=>{
        applyMoveOnBoard(state.board, from, to, state, {simulate:false, moveMeta: mv, promotionChar: pieceChar});
        const san = formatMoveSAN(piece, from, to, mv, targetBefore);
        appendMoveLog(san);
        state.turn = opposite(state.turn);
        pendingPromotion = null;
        hidePromotionModal();
        renderBoard();
        checkGameEnd();
        if (gameActive && activeMatchMode === 'ai' && state.turn === 'b') {
          setTimeout(doAIMove, 500);
        }
      });
    });
  });
}

if (resultPlayAgainBtn) {
  resultPlayAgainBtn.addEventListener('click', () => {
    hideResultModal();
    const restartMode = activeMatchMode || 'pvp';
    startGame(restartMode);
  });
}
if (resultHomeBtn) {
  resultHomeBtn.addEventListener('click', () => {
    hideResultModal();
    showHome();
  });
}

function showPromotionModal(color) {
  if (!promoModal) return;
  promoModal.classList.remove('hidden');
}

function hidePromotionModal() {
  if (!promoModal) return;
  promoModal.classList.add('hidden');
}

if (btnBuild) {
  btnBuild.addEventListener('click', showBuild);
}

if (playBtn) {
  playBtn.addEventListener('click', showPlay);
}

const leaderboardBtn = document.getElementById('btn-leaderboard');
if (leaderboardBtn) {
  leaderboardBtn.addEventListener('click', showLeaderboard);
}

// Deck UI handlers
if (btnSaveDeck) btnSaveDeck.addEventListener('click', ()=> saveDeck(deckNameInput.value));
if (btnExportDeck) btnExportDeck.addEventListener('click', ()=> exportDeck(deckSelect.value));
if (deckSelect) deckSelect.addEventListener('change', ()=>{ if (deckSelect.value) loadDeck(deckSelect.value); });
if (btnAddToPool) btnAddToPool.addEventListener('click', addSelectedPieceToPool);
if (btnClearBuild) btnClearBuild.addEventListener('click', ()=>{ buildBoard = createEmptyBuildBoard(); renderBuildBoard(); });


