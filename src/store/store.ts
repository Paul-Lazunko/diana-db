import { Datanautics } from 'datanautics';

import { config } from '@config';
export const store: Datanautics = new Datanautics({
  dumpPath: `${config.dumpDirectory}/${config.currentDumpName}`,
  dumpInterval: 1000,
  writer: true,
});
