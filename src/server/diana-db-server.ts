import { randomUUID } from 'crypto';
import net from 'net';
import tls from 'tls';
import { CryptoHelper } from '@helper';
import { ServerOptions } from '@options';
import { Request, Response } from '@dto';
import { userStore } from '@user-store';
import { logger } from '@logger';
import * as process from 'process';
import { ErrorFactory } from '@error';

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
    this.server.on('error', (e) => console.error);
  }

  public start() {
    this.server.listen(this.port);
    logger.info(`DianaDB Server has been started (port: ${this.port}, pid: ${process.pid})`);
  }

  public getSockets() {
    return Array.from(this.sockets.keys());
  }

  public stop() {
    this.server.close();
  }

  onConnection(socket: net.Socket | tls.TLSSocket) {
    const id: string = randomUUID();
    let savedPreviousStringData = '';
    let isPasswordCorrect: boolean = false;
    this.sockets.set(id, { id, socket, user: '', requestGroupId: '' });
    const addressInfo: any = socket.address();
    socket.addListener('data', (data: string) => {
      let user: string;
      let password: string;
      if (!data) {
        return;
      }
      let dataString: string = data.toString();
      const [
        userPart,
        ...restParts
      ] = dataString.split('\n');
      if (/^user:(\w+)(\:\w+)?/.test(userPart)) {
        const [
          ,
          user,
          mode,
        ] = userPart.match(/^user:(\w+)(\:\w+)?/);
        if (!userStore.get(`user.${user}`)) {
          return socket.end();
        }
        password = userStore.get(`user.${user}`)?.password;
        if (!password) {
          return socket.end();
        }
        const isSubscriber = mode === ':subscriber';
        if (isSubscriber) {
          this.subscribers.add(id);
        }
        this.sockets.get(id).user = user;
        dataString = restParts.join('\n');
        logger.info(`Connected user "${user}" ${isSubscriber ? ' (subscriber) ' : ''}from IP ${addressInfo.address}`);
      } else if (this.sockets.get(id).user) {
        user = this.sockets.get(id).user;
        if (!userStore.get(`user.${user}`)) {
          return socket.end();
        }
        password = userStore.get(`user.${user}`)?.password;
      }
      if (!password) {
        return socket.end();
      }
      const dataStringSplit: string[] = dataString.split('\n').filter((part: string) => !!part);
      for (let i = 0; i < dataStringSplit.length; i = i + 1) {
        if (dataStringSplit[i]) {
          try {
            const decryptedData: string = savedPreviousStringData.length
              ? CryptoHelper.decrypt(password, savedPreviousStringData + dataStringSplit[i])
              : CryptoHelper.decrypt(password, dataStringSplit[i]);
            const request: Request = JSON.parse(decryptedData);
            isPasswordCorrect = true;
            request.user = user || this.sockets.get(id)?.user;
            request.socket = id;
            request.addressInfo = addressInfo;
            savedPreviousStringData = '';
            if (request.requestGroupId) {
              this.sockets.get(id).requestGroupId = request.requestGroupId;
            }
            this.handler(request);
          } catch (e) {
            if (isPasswordCorrect) {
              savedPreviousStringData += dataStringSplit[i];
            } else {
              logger.error(ErrorFactory.connectionError(e.message));
              return socket.end();
            }
          }
        }
      }
    });
    socket.on('end', () => {
      if (this.sockets.has(id)) {
        this.sockets.delete(id);
        this.subscribers.delete(id);
      }
    });
    socket.on('close', () => {
      if (this.sockets.has(id)) {
        this.sockets.delete(id);
        this.subscribers.delete(id);
      }
    });
    socket.on('error', (e) => {
      if (this.sockets.has(id)) {
        this.sockets.delete(id);
        this.subscribers.delete(id);
      }
      logger.error(ErrorFactory.connectionError(e.message));
      socket.end();
    });
  }

  public response(response: Response) {
    const { socket } = response;
    const _socket: { socket: net.Socket | tls.TLSSocket; user: string } = this.sockets.get(socket);
    if (_socket) {
      const password = userStore.get(`user.${_socket.user}.password`);
      try {
        const _response: string = CryptoHelper.encrypt(password, JSON.stringify(response));
        _socket.socket.write(_response + '\n');
      } catch (error) {
        logger.error(error);
        _socket.socket.end();
      }
    }
  }
}
