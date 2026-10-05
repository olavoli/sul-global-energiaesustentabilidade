import { Database } from "bun:sqlite";
import type {
  D1Database,
  D1PreparedStatement,
  D1Result,
} from "../../../scripts/newsroom/storage/d1-types";
import { storageMigrations } from "../../../scripts/newsroom/storage/migrations";

export class LocalCommentDatabase implements D1Database {
  readonly sqlite = new Database(":memory:");
  constructor(version = 4) {
    this.sqlite.exec("PRAGMA foreign_keys=ON");
    for (const migration of storageMigrations.filter((item) => item.version <= version)) {
      for (const sql of migration.statements) this.sqlite.exec(sql);
    }
  }
  prepare(query: string) {
    return new LocalStatement(this.sqlite, query);
  }
  async batch<T>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
    return this.sqlite.transaction(() =>
      statements.map((statement) => (statement as LocalStatement).execute<T>()),
    )();
  }
  async exec(query: string) {
    this.sqlite.exec(query);
    return { success: true };
  }
}
class LocalStatement implements D1PreparedStatement {
  values: (string | number | null)[] = [];
  constructor(
    private sqlite: Database,
    readonly query: string,
  ) {}
  bind(...values: unknown[]) {
    this.values = values as (string | number | null)[];
    return this;
  }
  execute<T>(): D1Result<T> {
    const statement = this.sqlite.query(this.query);
    if (/^\s*SELECT/i.test(this.query))
      return { success: true, results: statement.all(...this.values) as T[], meta: { changes: 0 } };
    const result = statement.run(...this.values);
    return { success: true, results: [], meta: { changes: result.changes } };
  }
  async first<T>() {
    return (this.sqlite.query(this.query).get(...this.values) ?? null) as T | null;
  }
  async all<T>() {
    return { success: true, results: this.sqlite.query(this.query).all(...this.values) as T[] };
  }
  async run<T>() {
    return this.execute<T>();
  }
}
