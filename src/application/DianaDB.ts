import { config } from '../config';
import { EServerActions } from "../constants";
import { RequestController } from '../controller';
import { Database } from '../database';
import { ErrorFactory } from "../error";
import { addRootHandler, publishEventEmitter } from '../eventEmmitter';
import { logger } from '../logger';
import { RequestQueueHandler, ResponseQueueHandler } from '../queue';
import { DianaDBServer } from '../server';
import { store } from '../store';
import { IRequest, IResponse } from '../structures';
import { configurationValidator } from "../validator";


export class DianaDB {
  public databases: Map<string, Database>;
  protected server: DianaDBServer;
  protected controller: RequestController;
  public migrations: { [key: string]: number } = {};

  constructor() {
    this.validateConfiguration();
    this.databases = new Map<string, Database>();
    this.migrations = store.get('migrations') || {};
    this.server = new DianaDBServer({
      port: config.port,
      handler: this.enQueueRequest.bind(this)
    });
    RequestQueueHandler.initInstances({
      handler: this.requestHandler.bind(this)
    }, config.workersCount);
    ResponseQueueHandler.initInstances({
      handler: this.responseHandler.bind(this)
    },  config.workersCount)
    this.controller = new RequestController({
      databases: this.databases,
      dianaDB: this
    });
    addRootHandler('migrations', this.store.bind(this));
    publishEventEmitter.on('publish', this.onPublish.bind(this));

  }

  protected validateConfiguration() {
    const result: any = configurationValidator(config);
    if ( result && result.error ) {
      throw ErrorFactory.configurationError(result.error.message)
    }
  }

  protected get requestQueueHandler(): RequestQueueHandler {
    return RequestQueueHandler.getInstance()
  }

  protected get responseQueueHandler(): ResponseQueueHandler {
    return ResponseQueueHandler.getInstance()
  }

  public start() {
    try {
      this.restore();
    } catch(e) {
     throw ErrorFactory.restoreError(e.message);
    }
    ResponseQueueHandler.start();
    RequestQueueHandler.start();
    this.server.start();
  }

  public stop() {
    this.responseQueueHandler.stop();
    this.requestQueueHandler.stop();
    this.server.stop();
  }

  protected enQueueRequest(request: IRequest) {
    logger.info(JSON.stringify(request));
    this.requestQueueHandler.enQueue(request);
  }

  protected enQueueResponse(response: IResponse) {
    response.error ? logger.error(JSON.stringify(response)) : logger.info(JSON.stringify(response));
    this.responseQueueHandler.enQueue(response)
  }

  protected requestHandler(request: IRequest): void {
    const response : IResponse = this.controller.processRequest(request);
    this.enQueueResponse(response);
  }

  protected responseHandler(response: IResponse) {
    return this.server.response(response);
  }

  public store() {
    return this.migrations;
  }

  protected restore() {
    const databases: any = store.get('db');
    if ( databases ) {
      for ( const database in databases ) {
        this.databases.set(database, new Database({ name: database, dianaDB: this }));
        this.databases.get(database).restore(databases[database]);
      }
    }
  }

  onPublish(data: any) {
    const sockets: string[] = this.server.getSockets();
    for ( let i = 0; i < sockets.length; i = i + 1 ) {
      this.enQueueResponse({
        action: EServerActions.PUBLISH,
        data,
        socket: sockets[i]
      });
    }
  }

}

export const dianaDB = new DianaDB();
