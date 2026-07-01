const { Server } = require("socket.io");
// Accende il server sulla porta 8080 e permette le connessioni da qualsiasi sito (anche GitHub)
const io = new Server(8080, {
  cors: { origin: "*" }
});

let coda = [];

io.on("connection", (socket) => {
  console.log("Un giocatore si è connesso:", socket.id);

  // 1. Quando il giocatore clicca "Cerca Partita"
  socket.on("entraInCoda", (username) => {
    socket.username = username || "Anonimo";
    coda.push(socket);
    console.log(`${socket.username} è entrato in coda.`);

    // 2. Matchmaking automatico: se ci sono 2 persone, le accoppia subito
    if (coda.length >= 2) {
      const giocatore1 = coda.shift();
      const giocatore2 = coda.shift();

      // Crea una stanza invisibile e unica per loro due
      const stanzaId = `stanza_${Date.now()}`;
      giocatore1.join(stanzaId);
      giocatore2.join(stanzaId);

      // Lancia la moneta per il colore (Bianco o Nero)
      const g1eBianco = Math.random() < 0.5;

      // Avvisa i due browser che la partita è pronta!
      giocatore1.emit("partitaTrovata", { stanza: stanzaId, colore: g1eBianco ? "w" : "b", avversario: giocatore2.username });
      giocatore2.emit("partitaTrovata", { stanza: stanzaId, colore: g1eBianco ? "b" : "w", avversario: giocatore1.username });

      console.log(`Partita avviata nella ${stanzaId}`);
    }
  });

  // 3. Quando un giocatore muove, il server rimbalza la mossa all'avversario nella stanza
  socket.on("mossaFatta", (dati) => {
    socket.to(dati.stanza).emit("mossaAvversario", dati);
  });

  // 4. Se un giocatore chiude il browser o si disconnette
  socket.on("disconnect", () => {
    coda = coda.filter(s => s.id !== socket.id);
    console.log("Giocatore disconnesso:", socket.id);
  });
});

console.log("Server di Matchmaking attivo sulla porta 8080!");
