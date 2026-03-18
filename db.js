(function () {
  const DB_KEY = "truthlens_sqlite_db_b64";
  const MAX_HISTORY = 10;

  function bytesToBase64(bytes) {
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  function base64ToBytes(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  async function createDB() {
    const SQL = await initSqlJs({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/sql.js@1.13.0/dist/${file}`,
    });

    let db;
    const saved = localStorage.getItem(DB_KEY);
    if (saved) {
      db = new SQL.Database(base64ToBytes(saved));
    } else {
      db = new SQL.Database();
    }

    db.run(`
      CREATE TABLE IF NOT EXISTS searches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query TEXT NOT NULL,
        score INTEGER NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
    persist(db);
    return db;
  }

  function persist(db) {
    const data = db.export();
    localStorage.setItem(DB_KEY, bytesToBase64(data));
  }

  window.HistoryDB = {
    async init() {
      this.db = await createDB();
    },

    add(entry) {
      const stmt = this.db.prepare(
        "INSERT INTO searches (query, score, payload, created_at) VALUES (?, ?, ?, ?)"
      );
      stmt.run([entry.query, entry.score, JSON.stringify(entry.payload), entry.created_at]);
      stmt.free();

      this.db.run(
        `DELETE FROM searches WHERE id NOT IN (
          SELECT id FROM searches ORDER BY created_at DESC LIMIT ?
        )`,
        [MAX_HISTORY]
      );
      persist(this.db);
    },

    list() {
      const res = this.db.exec(
        "SELECT id, query, score, payload, created_at FROM searches ORDER BY created_at DESC LIMIT 10"
      );
      if (!res.length) return [];
      return res[0].values.map((row) => ({
        id: row[0],
        query: row[1],
        score: row[2],
        payload: JSON.parse(row[3]),
        created_at: row[4],
      }));
    },

    clear() {
      this.db.run("DELETE FROM searches");
      persist(this.db);
    },
  };
})();
