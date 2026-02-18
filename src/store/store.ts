import { Datanautics } from 'datanautics';

import { config } from '@config';
export const store: Datanautics = new Datanautics({
  pathToDumpFile: `${config.dumpDirectory}/${config.currentDumpName}`,
  storingInterval: 3000,
  writer: true,
});
