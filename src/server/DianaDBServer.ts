import { createServer, Server, Socket } from 'net';
import { EServerActions } from '../constants';
import { CryptoHelper, randomStringGenerator } from '../helpers';
import { IServerOptions } from '../options';
import { IPublishParams } from '../params';
import { IRequest, IResponse } from '../structures';
import { config } from '../config';

export class DianaDBServer {
  private server: Server;
  private readonly port: number;
  private sockets: Map <string, Socket>;
  private readonly handler: (request: IRequest) => void;

  constructor(options: IServerOptions) {
    const { port, handler } = options;
    this.sockets = new Map<string, Socket>();
    this.port = port;
    this.handler = handler;
    this.server = createServer(this.onConnection.bind(this));
    this.server.on('error', (e) => console.log);
  }

  public start() {
    this.server.listen(this.port);
  }

  public getSockets() {
    const sockets: string[] = [];
    this.sockets.forEach((socket: Socket, id: string) => {
      sockets.push(id);
    });
    return sockets;
  }

  public stop() {
    this.server.close();
  }

  onConnection(socket: Socket) {
    const id: string = randomStringGenerator(27, true);
    this.sockets.set(id, socket);
    const addressInfo: any = socket.address();
    socket.addListener('data', (data: string) => {
      try {
        const decryptedData: string = CryptoHelper.decrypt(config.secretKey, data.toString());
        const request: IRequest = JSON.parse(decryptedData);
        request.socket = id;
        request.addressInfo = addressInfo;
        this.onData(request)
      } catch(e) {
        socket.end();
      }
    });
    socket.on('end', () => {
     if ( this.sockets.has(id) ) {
       this.sockets.delete(id);
     }
    });
    socket.on('error', (e) => {
      if ( this.sockets.has(id) ) {
        this.sockets.delete(id);
      }
      socket.end();
    });
  }

  protected onData(request: IRequest) {
    this.handler(request);
  }

  public response(response: IResponse) {
    const { socket, requestId } = response;
    const _socket: Socket = this.sockets.get(socket);
    if ( _socket ) {
      const _response: string = CryptoHelper.encrypt(config.secretKey, JSON.stringify(response));
      try {
        _socket.write(_response+'\n');
      } catch (error) {
        console.error({ error });
      }
    }
  }

}
