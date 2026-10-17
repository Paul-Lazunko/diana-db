import { createReadStream, existsSync, readFileSync, watchFile } from 'fs';
import { randomUUID } from 'crypto';
import { config } from '@config';
import { DatabaseAccess, ServerActions, StoreStrategy, DEFAULT_DIANA_DB_USER_FILE_NAME, STORE_EE_EVENT_NAME } from '@const';
import { Request, User } from '@dto';
import { logger } from '@logger';
import { store } from '@store';
import { state } from '@state';
import { addRootHandler, persist, publishEventEmitter, startDumps, storeEventEmitter } from '@event-emitter';
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
      ssl.ca = readFileSync(config.tls.ca);
    }
    ssl.requestCert = config.tls.requestCert;
    ssl.rejectUnauthorized = config.tls.rejectUnauthorized;
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
    startDumps();
    for (const signal of signals) {
      process.once(signal, () => this.shutdown(signal));
    }
    this.server.start();
    monitorEventEmitter.emit('monitor');
  }

  public stop() {
    this.server.stop();
  }

  /** Stops accepting requests, saves every database and exits. */
  public async shutdown(signal: string) {
    logger.info(`Received ${signal}, saving databases before exit...`);
    this.server.stop();
    try {
      await persist();
      logger.info('Databases have been saved');
    } catch (e) {
      logger.error(ErrorFactory.storeError(e.message));
    }
    process.exit(0);
  }

  protected processRequest(request: Request) {
    const response = this.controller.processRequest(request);
    // Log metadata only: full requests and responses contain document data.
    const entry = JSON.stringify({
      requestId: request?.requestId,
      user: request?.user,
      action: request?.action,
      database: request?.database,
      collection: request?.collection,
      executionTime: response.executionTime,
      error: response.error,
    });
    response.error ? logger.error(entry as any) : logger.info(entry);
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
      // Only send updates of databases the subscriber is allowed to read.
      const user: string = this.server.getSocketUser(sockets[i]);
      const access = userStore.get(`user.${user}.db.${databaseUpdate.database}`);
      if (!user || !access || parseInt(access, 10) < DatabaseAccess.READ) {
        continue;
      }
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
