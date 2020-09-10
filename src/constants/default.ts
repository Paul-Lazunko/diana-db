import { EDumpInterval } from "./EDumpInterval";

export const DEFAULT_DI_DB_PORT: number = 34567;
export const DEFAULT_DI_DB_WORKERS_COUNT: number = 10;
export const DEFAULT_DI_DB_DUMP_CREATE_INTERVAL: EDumpInterval = EDumpInterval.DAY;
export const DEFAULT_DI_DB_DUMPS_DIRECTORY: string = '../../data';
export const DEFAULT_DI_DB_LOGS_DIRECTORY: string =  '../../logs/';
export const DEFAULT_DI_DB_DUMP_CURRENT_NAME: string =  'current.json';
export const DEFAULT_DI_DB_LOGS_TTL: string = '7d';
