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

function isLeapYear(year: number) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function getUnitsOfTime(unit: UnitOfTime, amount: number, initialValue: number): string[] {
  const result: string[] = [];
  if (
    ![
      UnitOfTime.YEAR,
      UnitOfTime.MONTH,
    ].includes(unit as any)
  ) {
    for (let i = 0; i < amount; i = i + 1) {
      result.push('DAY' as keyof MillisecondsIn);
    }
    return result;
  }
  const date = new Date(initialValue);
  if (unit === UnitOfTime.MONTH) {
    let year = date.getFullYear();
    let month = date.getMonth();
    for (let i = 0; i < amount; i = i + 1) {
      if (month === 1) {
        result.push(isLeapYear(year) ? 'MONTH29' : 'MONTH28');
      } else if (
        [
          0,
          2,
          4,
          6,
          7,
          9,
          11,
        ].includes(month)
      ) {
        result.push('MONTH31');
      } else {
        result.push('MONTH30');
      }
      year += month === 11 ? 1 : 0;
      month = month === 11 ? 0 : month + 1;
    }
    return result;
  } else if (unit === UnitOfTime.YEAR) {
    let year = date.getFullYear();
    for (let i = 0; i < amount; i = i + 1) {
      result.push(isLeapYear(year) ? 'YEAR366' : 'YEAR365');
      year += 1;
    }
    return result;
  }
}

export function addUnitOfTime(initialValue: number, amount: number, unit: UnitOfTime, multiplier: -1 | 1): number {
  let result = initialValue;
  const units = getUnitsOfTime(unit, amount, initialValue);
  for (const u of units) {
    result += multiplier * MillisecondsIn[u];
  }
  return result;
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
