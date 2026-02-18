import { Datanautics } from 'datanautics';
import { config } from '@config';

export const userReadStore: Datanautics = new Datanautics({
  pathToDumpFile: `${config.dumpDirectory}/users`,
  writer: false,
});
