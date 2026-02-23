import { DumpInterval, MillisecondsIn, UnitOfTime, Weekday, WeekdayNumber } from '@const';

const oneDayInMilliseconds = 1000 * 60 * 60 * 24;

export function getWeek(date: Date): number {
  const _date: Date = new Date(date.getTime());
  const dayNum: number = date.getUTCDay() || 7;
  _date.setUTCDate(_date.getUTCDate() + 4 - dayNum);
  const startOfYear: Date = new Date(Date.UTC(_date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - startOfYear.getTime()) / 86400000 + 1) / 7);
}

export function getDayOfYear(date: Date): number {
  const startOfYear: Date = new Date(date.getFullYear(), 0, 0);
  const diff: number = date.getTime() - startOfYear.getTime();
  return Math.round(diff / oneDayInMilliseconds);
}
function daysBetweenMonthsSafe(initialDate: number, monthAmount: number) {
  const start = new Date(initialDate);

  const targetYear = start.getFullYear();
  const targetMonth = start.getMonth() + monthAmount;

  const end = new Date(targetYear, targetMonth, 1);

  const lastDayOfTargetMonth = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();

  const day = Math.min(start.getDate(), lastDayOfTargetMonth);

  end.setDate(day);

  const utcStart = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());

  const utcEnd = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());

  return (utcEnd - utcStart) / (1000 * 60 * 60 * 24);
}

export function addUnitOfTime(initialValue: number, amount: number, unit: UnitOfTime, multiplier: -1 | 1): number {
  const date = new Date(initialValue);
  const value = amount * multiplier;

  switch (unit) {
    case UnitOfTime.YEAR:
      date.setFullYear(date.getFullYear() + value);
      return date.getTime();

    case UnitOfTime.MONTH: {
      const day = date.getDate();
      date.setMonth(date.getMonth() + value);
      const lastDay = new Date(date.getFullYear(), date.getMonth(), 0).getDate();
      date.setDate(Math.min(day, lastDay));
      return date.getTime();
    }

    case UnitOfTime.WEEK:
      return initialValue + value * 7 * MillisecondsIn.DAY;

    case UnitOfTime.DAY:
      return initialValue + value * MillisecondsIn.DAY;

    case UnitOfTime.HOUR:
      return initialValue + value * MillisecondsIn.HOUR;

    case UnitOfTime.MINUTE:
      return initialValue + value * MillisecondsIn.MINUTE;

    case UnitOfTime.SECOND:
      return initialValue + value * MillisecondsIn.SECOND;

    case UnitOfTime.MILLISECOND:
      return initialValue + value;

    default:
      return initialValue;
  }
}

export function toStartOf(initialValue: number, unit: UnitOfTime): number {
  let result = initialValue - (initialValue % MillisecondsIn[unit.toUpperCase()]);
  if (unit === UnitOfTime.WEEK) {
    result -= 3 * MillisecondsIn.DAY;
  }
  return result;
}

export function toEndOf(initialValue: number, unit: UnitOfTime): number {
  let result = (Math.floor(initialValue / MillisecondsIn[unit.toUpperCase()]) + 1) * MillisecondsIn[unit.toUpperCase()];
  if (unit === UnitOfTime.WEEK) {
    result += 3 * MillisecondsIn.DAY;
  }
  if (
    [
      UnitOfTime.YEAR,
      UnitOfTime.MONTH,
      UnitOfTime.WEEK,
    ].includes(unit as any)
  ) {
    result += MillisecondsIn.DAY - 1;
  } else {
    result -= 1;
  }
  return result;
}

export function toNextWeekday(initialValue: number, weekday: Weekday) {
  const current = new Date(initialValue).getDay();
  const next = WeekdayNumber[weekday.toUpperCase()];
  const diff = 7 - (current - next);
  return initialValue + diff * MillisecondsIn.DAY;
}
export function toLastWeekday(initialValue: number, weekday: Weekday) {
  const current = new Date(initialValue).getDay();
  const next = WeekdayNumber[weekday.toUpperCase()];
  const diff = current === next ? 7 : current - next;
  return initialValue - diff * MillisecondsIn.DAY;
}

export function getDateString(interval: DumpInterval = DumpInterval.DAY) {
  if (interval === 'hour') {
    const hour: number = new Date().getHours();
    const hourString: string = hour < 10 ? `0${hour}` : hour.toString();
    return `${new Date().toISOString().slice(0, 10)}T${hourString}-00-00`;
  }
  return new Date().toISOString().slice(0, 10);
}
