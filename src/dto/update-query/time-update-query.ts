import { UnitOfTime, Weekday } from '@const';
import { UpdateTimeHolderItem } from './update-time-holder-item';

export type TimeUpdateQuery = {
  $add: UpdateTimeHolderItem;
  $subtract: UpdateTimeHolderItem;
  $toStartOf: UnitOfTime;
  $toEndOf: UnitOfTime;
  $toNextWeekDay: Weekday;
  $toLastWeekDay: Weekday;
};
