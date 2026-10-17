import { closeSync, fdatasyncSync, openSync, readdirSync, readFileSync, unlinkSync, writeSync } from 'fs';
import { join } from 'path';

export type WalEntry = Record<string, any>;

const FILE_PATTERN: RegExp = /^wal-\d{13}-\d{6}\.log$/;

/**
 * Append-only log of applied changes, used together with the periodic snapshot:
 *  - every change (insert with its _id, final values of an update, removed ids, schema operations)
 *    is appended as one JSON line;
 *  - appends made during one event-loop turn are written and fsynced together (group commit), and
 *    responses to the requests that produced them are sent only after that;
 *  - when a snapshot captures the state, the log switches to a new file; the files covered by the
 *    snapshot are deleted once the snapshot is safely on disk (compaction);
 *  - at start-up the snapshot is restored and the remaining log files are replayed in order.
 * Replay is idempotent: entries already contained in the snapshot are skipped or re-applied harmlessly.
 */
export class WriteAheadLog {
  public enabled: boolean = false;
  public replaying: boolean = false;
  private directory: string;
  private fsync: boolean = true;
  private fd: number | null = null;
  private sequence: number = 0;
  private pending: string[] = [];
  private waiters: ((error?: Error) => void)[] = [];
  private flushScheduled: boolean = false;

  public open(directory: string, options: { fsync: boolean }) {
    this.directory = directory;
    this.fsync = options.fsync;
    this.openNewFile();
    this.enabled = true;
  }

  public append(entry: WalEntry) {
    if (!this.enabled || this.replaying) {
      return;
    }
    this.pending.push(JSON.stringify(entry));
    if (!this.flushScheduled) {
      this.flushScheduled = true;
      setImmediate(() => this.flush());
    }
  }

  /** Calls back once everything appended so far is on disk (immediately when nothing is pending). */
  public whenDurable(callback: (error?: Error) => void) {
    if (!this.pending.length) {
      return callback();
    }
    this.waiters.push(callback);
  }

  public flush() {
    this.flushScheduled = false;
    if (!this.pending.length) {
      return;
    }
    const lines: string[] = this.pending;
    const waiters = this.waiters;
    this.pending = [];
    this.waiters = [];
    let error: Error | undefined;
    try {
      writeSync(this.fd, lines.join('\n') + '\n');
      if (this.fsync) {
        fdatasyncSync(this.fd);
      }
    } catch (e) {
      error = e;
    }
    waiters.forEach((waiter) => waiter(error));
  }

  /**
   * Called at the moment a snapshot captures the in-memory state. Everything logged so far is contained
   * in that snapshot, so logging continues in a new file. Returns the files the snapshot makes obsolete.
   */
  public rotate(): string[] {
    if (!this.enabled) {
      return [];
    }
    this.flush();
    const obsolete: string[] = this.listFiles();
    closeSync(this.fd);
    this.openNewFile();
    return obsolete;
  }

  public removeFiles(files: string[]) {
    for (const file of files) {
      try {
        unlinkSync(file);
      } catch {
        // already gone
      }
    }
  }

  /** Replays all log files in order. A torn last line (crash mid-write) is ignored. */
  public replay(apply: (entry: WalEntry) => void, onError?: (error: Error) => void): number {
    let count: number = 0;
    this.replaying = true;
    try {
      for (const file of this.listFiles()) {
        for (const line of readFileSync(file, 'utf8').split('\n')) {
          if (!line) {
            continue;
          }
          let entry: WalEntry;
          try {
            entry = JSON.parse(line);
          } catch {
            continue;
          }
          try {
            apply(entry);
            count = count + 1;
          } catch (e) {
            onError?.(e);
          }
        }
      }
    } finally {
      this.replaying = false;
    }
    return count;
  }

  public listFiles(): string[] {
    return readdirSync(this.directory)
      .filter((name: string) => FILE_PATTERN.test(name))
      .sort()
      .map((name: string) => join(this.directory, name));
  }

  private openNewFile() {
    const name: string = `wal-${String(Date.now()).padStart(13, '0')}-${String(this.sequence).padStart(6, '0')}.log`;
    this.sequence = this.sequence + 1;
    this.fd = openSync(join(this.directory, name), 'a');
  }
}

export const wal: WriteAheadLog = new WriteAheadLog();

/** Deletes every log file in a directory (used when a backup replaces the current dump). */
export function removeWalFiles(directory: string): number {
  const files: string[] = readdirSync(directory).filter((name: string) => FILE_PATTERN.test(name));
  files.forEach((name: string) => unlinkSync(join(directory, name)));
  return files.length;
}
