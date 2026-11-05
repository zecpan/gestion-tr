import "server-only";
import { randomUUID } from "node:crypto";
import { getDatabase } from "./db.js";

export function recordAudit({ actor, action, entityType, entityId, before = null, after = null }) {
  getDatabase().prepare(
    `INSERT INTO audit_log (id, actor, action, entity_type, entity_id, before_json, after_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    randomUUID(), actor, action, entityType, entityId,
    before === null ? null : JSON.stringify(before),
    after === null ? null : JSON.stringify(after),
    new Date().toISOString()
  );
}

export function listRecentAudit(limit = 30) {
  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 30));
  return getDatabase().prepare(
    `SELECT id, actor, action, entity_type AS entityType, entity_id AS entityId,
       before_json AS beforeJson, after_json AS afterJson, created_at AS createdAt
     FROM audit_log ORDER BY created_at DESC LIMIT ?`
  ).all(safeLimit).map((entry) => ({
    id: entry.id,
    actor: entry.actor,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    before: entry.beforeJson ? JSON.parse(entry.beforeJson) : null,
    after: entry.afterJson ? JSON.parse(entry.afterJson) : null,
    createdAt: entry.createdAt,
  }));
}
