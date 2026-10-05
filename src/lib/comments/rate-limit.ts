import type { D1Database } from "../../../scripts/newsroom/storage/d1-types";
import { commentHmac } from "./visitor";

export async function commentRateAllowed(
  database: D1Database,
  request: Request,
  secret: string,
  action: "submit" | "reaction" | "report",
  visitorHash?: string,
): Promise<boolean> {
  const maximum = action === "submit" ? 5 : action === "report" ? 5 : 60;
  const windowMs = action === "reaction" ? 60_000 : 15 * 60_000;
  const now = Date.now();
  const ipHash = await commentHmac(
    request.headers.get("cf-connecting-ip") ?? "unknown",
    `${secret}:rate-limit`,
  );
  const identifiers = visitorHash ? [ipHash, visitorHash] : [ipHash];
  // Each reservation is one conditional UPSERT, including simultaneous requests.
  for (const identifier of identifiers) {
    // Keep the existing submission/IP key so an upgrade does not reset its window.
    const key =
      action === "submit" && identifier === ipHash
        ? `comments:${identifier}`
        : `comments:${action}:${identifier}`;
    const result = await database
      .prepare(
        `INSERT INTO newsroom_rate_limits (key,state_json,expires_at)
      VALUES (?1,json_object('attempts',json_array(?2)),?3)
      ON CONFLICT(key) DO UPDATE SET
        state_json=json_object('attempts',json((SELECT json_group_array(value) FROM (
          SELECT value FROM json_each(newsroom_rate_limits.state_json,'$.attempts') WHERE value>?4
          UNION ALL SELECT ?2)))), expires_at=?3
      WHERE (SELECT COUNT(*) FROM json_each(newsroom_rate_limits.state_json,'$.attempts') WHERE value>?4)<?5`,
      )
      .bind(key, now, now + windowMs, now - windowMs, maximum)
      .run();
    if (!result.success || result.meta?.changes !== 1) return false;
  }
  return true;
}
