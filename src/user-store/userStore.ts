import { Datanautics } from 'datanautics';
import { config } from '@config';

export const userReadStore: Datanautics = new Datanautics({
  dumpPath: `${config.dumpDirectory}/users`,
  writer: false,
});

export const userWriteStore: Datanautics = new Datanautics({
  dumpPath: `${config.dumpDirectory}/users`,
  writer: true,
});
