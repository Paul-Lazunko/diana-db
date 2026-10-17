import { randomUUID } from 'crypto';
import net from 'net';
import tls from 'tls';
import { CryptoHelper } from '@helper';
import { ServerOptions } from '@options';
import { Request, Response } from '@dto';
import { getUserKey } from '@user-store';
import { logger } from '@logger';
import * as process from 'process';
import { ErrorFactory } from '@error';

// Handshake line sent before the first request:
//   "user:<name>"                         regular connection, authenticated by its first encrypted request
//   "user:<name>:subscriber:<token>"      subscription; token = encrypt(key, "user:<name>:subscriber:<YYYY-MM-DD>")
const HANDSHAKE_REGEXP: RegExp = /^user:(\w+)(?::(\w+))?(?::([A-Za-z0-9+/=]+))?$/;
const DAY_MS: number = 24 * 60 * 60 * 1000;

/**
 * Subscribers never send an encrypted request, so the token is their only proof of the password.
 * Dates from yesterday to tomorrow (UTC) are accepted: a client using its local date can be a day
 * ahead of or behind UTC.
 */
function isValidSubscriberToken(user: string, key: Buffer, token: string): boolean {
  if (!token) {
    return false;
  }
  let decrypted: string;
  try {
    decrypted = CryptoHelper.decrypt(key, token);
  } catch {
    return false;
  }
  const now: number = Date.now();
  return [
    now - DAY_MS,
    now,
    now + DAY_MS,
  ].some((time: number) => decrypted === `user:${user}:subscriber:${new Date(time).toISOString().slice(0, 10)}`);
}
// Largest accepted request line (encrypted, base64). Protects memory from a line that never ends.
const MAX_LINE_LENGTH: number = 64 * 1024 * 1024;

export class DianaDbServer {
  private server: net.Server;
  private readonly port: number;
  private sockets: Map<
    string,
    { id: string; socket: net.Socket | tls.TLSSocket; user: string; requestGroupId: string }
  >;
  public subscribers: Set<string>;
  private readonly handler: (request: Request) => void;

  constructor(options: ServerOptions) {
    const { port, handler, ssl } = options;
    this.sockets = new Map<
      string,
      { id: string; socket: net.Socket | tls.TLSSocket; user: string; requestGroupId: string }
    >();
    this.subscribers = new Set<string>();
    this.port = port;
    this.handler = handler;
    const secure: boolean = Boolean(ssl?.key && ssl?.cert);
    const connectionListener = this.onConnection.bind(this);
    this.server = secure ? tls.createServer(ssl, connectionListener) : net.createServer(connectionListener);
    this.server.on('error', (e: Error) => logger.error(ErrorFactory.connectionError(e.message)));
  }

  public start() {
    this.server.listen(this.port);
    logger.info(`DianaDB Server has been started (port: ${this.port}, pid: ${process.pid})`);
  }

  public getSockets() {
    return Array.from(this.sockets.keys());
  }

  public getSocketUser(id: string): string | undefined {
    return this.sockets.get(id)?.user;
  }

  public stop() {
    this.server.close();
  }

  onConnection(socket: net.Socket | tls.TLSSocket) {
    const id: string = randomUUID();
    const addressInfo: any = socket.address();
    let buffer: string = '';
    this.sockets.set(id, { id, socket, user: '', requestGroupId: '' });
    socket.setEncoding('utf8');

    const close = (reason?: string) => {
      if (reason) {
        logger.error(ErrorFactory.connectionError(reason));
      }
      this.removeSocket(id);
      socket.end();
    };

    // Handles one complete line. Returns false when the connection has been closed.
    const processLine = (line: string): boolean => {
      const handshake: RegExpMatchArray | null = line.match(HANDSHAKE_REGEXP);
      if (handshake) {
        const [
          ,
          user,
          mode,
          token,
        ] = handshake;
        const key: Buffer = getUserKey(user);
        if (!key) {
          close();
          return false;
        }
        const isSubscriber: boolean = mode === 'subscriber';
        if (isSubscriber) {
          if (!isValidSubscriberToken(user, key, token)) {
            close(`Rejected subscription of user "${user}" from ${addressInfo.address}: invalid or expired token`);
            return false;
          }
          this.subscribers.add(id);
        }
        this.sockets.get(id).user = user;
        logger.info(`Connected user "${user}" ${isSubscriber ? ' (subscriber) ' : ''}from IP ${addressInfo.address}`);
        return true;
      }

      const user: string = this.sockets.get(id)?.user;
      const key: Buffer = getUserKey(user);
      if (!key) {
        close();
        return false;
      }

      let request: Request;
      try {
        request = JSON.parse(CryptoHelper.decrypt(key, line));
      } catch (e) {
        // With line framing, a complete line that fails to decrypt means a wrong password or a corrupted
        // stream. Close instead of buffering it, which used to poison every following request.
        close(`Rejected request from user "${user}" (${addressInfo.address}): ${e.message}`);
        return false;
      }

      request.user = user;
      request.socket = id;
      request.addressInfo = addressInfo;
      if (request.requestGroupId) {
        this.sockets.get(id).requestGroupId = request.requestGroupId;
      }
      try {
        this.handler(request);
      } catch (e) {
        // A failing request must not take the connection down.
        logger.error(ErrorFactory.requestError(e.message));
      }
      return true;
    };

    socket.on('data', (chunk: string) => {
      // Only scan the newly received part for newlines, so a large request split over many chunks stays linear.
      const scanFrom: number = buffer.length;
      buffer += chunk;
      let lineStart: number = 0;
      let newline: number = buffer.indexOf('\n', scanFrom);
      while (newline !== -1) {
        const line: string = buffer.slice(lineStart, newline).replace(/\r$/, '');
        lineStart = newline + 1;
        if (line && !processLine(line)) {
          buffer = '';
          return;
        }
        newline = buffer.indexOf('\n', lineStart);
      }
      buffer = buffer.slice(lineStart);
      if (buffer.length > MAX_LINE_LENGTH) {
        buffer = '';
        close(`Request from ${addressInfo.address} exceeds ${MAX_LINE_LENGTH} characters`);
      }
    });
    socket.on('end', () => this.removeSocket(id));
    socket.on('close', () => this.removeSocket(id));
    socket.on('error', (e: Error) => {
      this.removeSocket(id);
      logger.error(ErrorFactory.connectionError(e.message));
      socket.end();
    });
  }

  private removeSocket(id: string) {
    this.sockets.delete(id);
    this.subscribers.delete(id);
  }

  public response(response: Response) {
    const { socket } = response;
    const _socket: { socket: net.Socket | tls.TLSSocket; user: string } = this.sockets.get(socket);
    if (_socket) {
      const key: Buffer = getUserKey(_socket.user);
      if (!key) {
        return _socket.socket.end();
      }
      try {
        const _response: string = CryptoHelper.encrypt(key, JSON.stringify(response));
        _socket.socket.write(_response + '\n');
      } catch (error) {
        logger.error(error);
        _socket.socket.end();
      }
    }
  }
}
