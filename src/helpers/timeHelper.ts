import { EDumpInterval } from '../constants';

const oneDayInMilliseconds = 1000 * 60 * 60 * 24;

export function getWeek(date: Date): number {
    const _date = new Date(date.getTime());
    const dayNum = date.getUTCDay() || 7;
    _date.setUTCDate(_date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(_date.getUTCFullYear(),0,1));
    // @ts-ignore
    return Math.ceil((((date - yearStart) / 86400000) + 1)/7)
}

export function getDayOfYear(date: Date): number {
    const startOfYEar = new Date(date.getFullYear(), 0, 0);
    // @ts-ignore
    const diff = date - startOfYEar;
    return Math.round(diff / oneDayInMilliseconds);
}

export function getDateString(interval: EDumpInterval = EDumpInterval.DAY) {
  if ( interval === 'hour' ) {
    const hour: number = new Date().getHours();
    const hourString: string = hour < 10 ? `0${hour}` : hour.toString();
    return `${new Date().toISOString().slice(0, 10)}T${hourString}-00-00`;
  }
  return new Date().toISOString().slice(0, 10);
}
