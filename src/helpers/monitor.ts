import v8 from 'v8';

import { monitorEventLoopDelay, performance } from 'perf_hooks';

const h = monitorEventLoopDelay({ resolution: 10 });
h.enable();

let lastELU = performance.eventLoopUtilization();

function getELU() {
  const elu = performance.eventLoopUtilization(lastELU);
  lastELU = elu;

  return parseFloat((elu.utilization * 100).toFixed(2));
}

function getEventLoopDelay() {
  return parseFloat((h.mean / 1e6).toFixed(2));
}

function createCpuMonitor() {
  let lastCpu = process.cpuUsage();
  let lastTime = process.hrtime.bigint();

  return function getCpuPercent() {
    const nowCpu = process.cpuUsage();
    const nowTime = process.hrtime.bigint();

    const cpuUser = nowCpu.user - lastCpu.user;
    const cpuSystem = nowCpu.system - lastCpu.system;

    const elapsedTime = Number(nowTime - lastTime) / 1000; // μs

    lastCpu = nowCpu;
    lastTime = nowTime;

    const totalCpuTime = cpuUser + cpuSystem;
    const cpuPercent = (totalCpuTime / elapsedTime) * 100;

    return parseFloat(cpuPercent.toFixed(2));
  };
}

const getCpuUsage = createCpuMonitor();

function getGcPressure() {
  const stats = v8.getHeapStatistics();

  return parseFloat(((stats.used_heap_size / stats.heap_size_limit) * 100).toFixed(2));
}

function getMemoryUsage() {
  const mem = process.memoryUsage();
  return parseFloat((mem.heapUsed / 1024 / 1024).toFixed(2));
}

export function monitor() {
  const memory = getMemoryUsage();
  const cpu = getCpuUsage();
  const gcp = getGcPressure();
  const elu = getELU();
  const eld = getEventLoopDelay();
  return {
    memory,
    cpu,
    gcp,
    elu,
    eld,
  };
}
