import { createReadStream, existsSync, readFileSync, watchFile } from 'fs';
import { randomUUID } from 'crypto';
import { config } from '@config';
import { ServerActions, StoreStrategy, DEFAULT_DIANA_DB_USER_FILE_NAME, STORE_EE_EVENT_NAME } from '@const';
import { Request, User } from '@dto';
import { logger } from '@logger';
import { store } from '@store';
import { state } from '@state';
import { addRootHandler, publishEventEmitter, storeEventEmitter } from '@event-emitter';
import { DianaDbServer } from '@server';
import { Database } from '@database';
import { RequestController } from '@controller';
import { ErrorFactory } from '@error';
import { configurationValidator } from '@validator';
import { DatabaseUpdate } from '@parameters';
import { userStore } from '@user-store';
import { monitorEventEmitter } from '../event-emitter/monitor-event-emitter';
import { restoreStrategies } from '@restore-strategy';
import { Readable } from 'stream';
import { touch } from '@helper';

const signals = [
  'SIGINT',
  'SIGTERM',
];
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
    if (config.tls.cert && existsSync(config.tls.cert)) {
      ssl.cert = readFileSync(config.tls.cert);
    }
    if (config.tls.key && existsSync(config.tls.key)) {
      ssl.key = readFileSync(config.tls.key);
    }
    if (config.tls.ca && existsSync(config.tls.ca)) {
      ssl.key = readFileSync(config.tls.ca);
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

  public async start() {
    logger.info(`Restoring databases using ${config.storeStrategy} strategy...`);
    await this.restore();
    logger.info('Databases have been restored successfully!');
    storeEventEmitter.emit(STORE_EE_EVENT_NAME);
    this.server.start();
    monitorEventEmitter.emit('monitor');
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
    store.set(`migrations`, this.migrations || {});
    return this.databases.forEach(async (database: Database) => {
      store.set(`db.${database.name}`, database.store());
    });
  }

  protected async getUserFileContent() {
    switch (config.storeStrategy) {
      case StoreStrategy.LOCAL:
        await restoreStrategies.local.restore(userStore, `${config.dumpDirectory}/${DEFAULT_DIANA_DB_USER_FILE_NAME}`);
        break;
      case StoreStrategy.S3:
        await restoreStrategies.s3.restore(userStore, DEFAULT_DIANA_DB_USER_FILE_NAME);
        break;
    }
  }

  protected async restore() {
    switch (config.storeStrategy) {
      case StoreStrategy.LOCAL:
        await touch(`${config.dumpDirectory}/${config.currentDumpName}`);
        await touch(`${config.dumpDirectory}/${DEFAULT_DIANA_DB_USER_FILE_NAME}`);
        await restoreStrategies.local.restore(store, `${config.dumpDirectory}/${config.currentDumpName}`);
        break;
      case StoreStrategy.S3:
        await restoreStrategies.s3.restore(store, config.currentDumpName);
        break;
    }
    await this.getUserFileContent();
    if (config.storeStrategy === StoreStrategy.LOCAL) {
      const userFilePath = `${config.dumpDirectory}/${DEFAULT_DIANA_DB_USER_FILE_NAME}`;
      watchFile(userFilePath, async () => {
        try {
          await this.getUserFileContent();
        } catch (e) {
          logger.error(ErrorFactory.restoreError(e.message));
        }
      });
    }
    const databases: any = store.get('db');
    const migrations = store.get('migrations');
    if (migrations && typeof migrations === 'object') {
      this.migrations = migrations;
    }
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
    const requestId = randomUUID();
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
