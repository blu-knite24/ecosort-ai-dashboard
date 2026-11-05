import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export function openDatabase(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS events (id TEXT NOT NULL, topic TEXT NOT NULL, simulated INTEGER NOT NULL, ts INTEGER NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(id,topic,simulated));
    CREATE INDEX IF NOT EXISTS events_history ON events(topic,simulated,ts DESC);
    CREATE TABLE IF NOT EXISTS commands (id TEXT PRIMARY KEY, simulated INTEGER NOT NULL, payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS snapshots (topic TEXT NOT NULL, simulated INTEGER NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(topic,simulated));`);
  return {
    record(topic, data) { return db.prepare('INSERT OR IGNORE INTO events VALUES(?,?,?,?,?)').run(data.id ?? data.eventId, topic, +data.simulated, data.ts, JSON.stringify(data)).changes > 0; },
    history({simulated=false, limit=20000, from=0, to=Number.MAX_SAFE_INTEGER, category, search='' }={}) {
      const rows = db.prepare("SELECT payload FROM events WHERE topic='classification' AND simulated=? AND ts>=? AND ts<=? AND (? IS NULL OR json_extract(payload,'$.category')=?) AND json_extract(payload,'$.object') LIKE ? ORDER BY ts DESC LIMIT ?").all(+simulated, from, to, category ?? null, category ?? null, `%${search}%`, limit);
      return rows.map(r => JSON.parse(r.payload));
    },
    snapshot(topic, simulated, value) { db.prepare('INSERT OR REPLACE INTO snapshots VALUES(?,?,?)').run(topic,+simulated,JSON.stringify(value)); },
    getSnapshot(topic, simulated) { const r=db.prepare('SELECT payload FROM snapshots WHERE topic=? AND simulated=?').get(topic,+simulated); return r ? JSON.parse(r.payload) : null; },
    command(value) { db.prepare('INSERT OR REPLACE INTO commands VALUES(?,?,?)').run(value.id,+value.simulated,JSON.stringify(value)); },
    getCommand(id) { const r=db.prepare('SELECT payload FROM commands WHERE id=?').get(id); return r ? JSON.parse(r.payload) : null; },
    close() { db.close(); },
  };
}