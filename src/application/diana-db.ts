import { existsSync, readFileSync } from 'fs';
import { v4 } from 'uuid';
import { config } from '@config';
import { ServerActions } from '@const';
import { Request, User } from '@dto';
import { logger } from '@logger';
import { store } from '@store';
import { state } from '@state';
import { addRootHandler, publishEventEmitter } from '@event-emitter';
import { DianaDbServer } from '@server';
import { Database } from '@database';
import { RequestController } from '@controller';
import { ErrorFactory } from '@error';
import { configurationValidator } from '@validator';
import { DatabaseUpdate } from '@parameters';
export class DianaDB {
  public databases: Map<string, Database>;
  public users: Map<string, User>;
  public server: DianaDbServer;
  protected controller: RequestController;
  public migrations: { [key: number]: number } = {};

  constructor() {
    this.validateConfiguration();
    state.inject({ dianaDB: this });
    this.users = new Map<string, User>();
    this.databases = new Map<string, Database>();
    this.migrations = store.get('migrations') || {};
    const ssl: any = {};
    if (config.cert && existsSync(config.cert)) {
      ssl.cert = readFileSync(config.cert);
    }
    if (config.key && existsSync(config.key)) {
      ssl.key = readFileSync(config.key);
    }
    this.server = new DianaDbServer({
      port: config.port,
      ssl,
      handler: this.processRequest.bind(this),
    });
    this.controller = new RequestController({
      databases: this.databases,
      dianaDB: this,
    });
    addRootHandler('migrations', this.store.bind(this));
    publishEventEmitter.on('publish', (databaseUpdate: DatabaseUpdate) => this.onPublish(databaseUpdate));
  }

  protected validateConfiguration() {
    const result: any = configurationValidator(config);
    if (result && result.error) {
      throw ErrorFactory.configurationError(result.error.message);
    }
  }

  public start() {
    try {
      logger.info('Restoring...');
      this.restore();
    } catch (e) {
      logger.info('Restore Error:');
      logger.error(e);
      throw ErrorFactory.restoreError(e.message);
    }
    this.server.start();
    logger.info(`DianaDb Server has been started (pid: ${process.pid})`);
  }

  public stop() {
    this.server.stop();
  }

  protected processRequest(request: Request) {
    logger.info(JSON.stringify(request));
    const response = this.controller.processRequest(request);
    response.error ? logger.error(JSON.stringify(response) as any) : logger.info(JSON.stringify(response));
    return this.server.response(response);
  }

  public store() {
    return this.databases.forEach((database: Database) => {
      store.set(`db.${database.name}`, database.store());
    });
  }

  protected restore() {
    const databases: any = store.get('db');
    if (databases) {
      for (const database in databases) {
        if (!this.databases.has(database)) {
          this.databases.set(database, new Database({ name: database, dianaDB: this }));
        }
        this.databases.get(database).restore(databases[database]);
      }
    }
  }

  onPublish(databaseUpdate: DatabaseUpdate) {
    const requestId = v4();
    const sockets: string[] = Array.from(this.server.subscribers);
    const subscribersCount = sockets.length;
    for (let i = 0; i < subscribersCount; i = i + 1) {
      this.server.response({
        action: ServerActions.PUBLISH,
        data: databaseUpdate,
        socket: sockets[i],
        requestId,
      });
    }
  }
}

export const dianaDB: DianaDB = new DianaDB();
