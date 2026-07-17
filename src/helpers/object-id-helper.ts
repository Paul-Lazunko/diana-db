import os, { NetworkInterfaceInfo } from 'os';

const _pid: number = process.pid;
const ntw: any = os.networkInterfaces();
let _mac: string = '';
for (const key in ntw) {
  let makeBreak: boolean = false;
  const ntwItem: NetworkInterfaceInfo[] = ntw[key];
  for (let i = 0; i < ntwItem.length; i = i + 1) {
    if (ntwItem[i].internal === false) {
      _mac = ntwItem[i].mac;
      makeBreak = true;
      break;
    }
  }
  if (makeBreak) {
    break;
  }
}

let pid: string = _pid.toString(16);
const mac: string = _mac.replace(/\:/g, '');
const base: string = '123456789abcdef';

while (pid.length < 4) {
  pid = '0' + pid;
}

export function objectIdHelper(): string {
  const ts: string = Date.now().toString(16);
  let rnd: string = '';
  while (rnd.length < 9) {
    rnd += base.charAt(Math.floor(Math.random() * base.length));
  }
  return `${mac}-${pid}-${ts}-${rnd}`;
}
