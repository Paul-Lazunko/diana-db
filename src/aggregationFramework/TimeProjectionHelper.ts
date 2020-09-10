import { ErrorFactory } from "../error";
import { getDayOfYear, getWeek } from '../helpers';
import { validateTimeString } from '../validator';
import { BaseProjectionHelper } from './BaseProjectionHelper';

export class TimeProjectionHelper extends BaseProjectionHelper {

  public $year (item: any, key: string, value: string, root: any) {
    const timeString: string = this.getItemProperty(item, value);
    const date =  this.validateTimeString(timeString);
    root[key] = date.getFullYear();
  }

  public $month (item: any, key: string, value: string, root: any) {
    const timeString: string = this.getItemProperty(item, value);
    const date =  this.validateTimeString(timeString);
    root[key] = date.getMonth();
  }

  public $date (item: any, key: string, value: string, root: any) {
    const timeString: string = this.getItemProperty(item, value);
    const date =  this.validateTimeString(timeString);
    root[key] = date.getDate();
  }
  public $hours (item: any, key: string, value: string, root: any) {
    const timeString: string = this.getItemProperty(item, value);
    const date =  this.validateTimeString(timeString);
    root[key] = date.getHours();
  }

  public $minutes (item: any, key: string, value: string, root: any) {
    const timeString: string = this.getItemProperty(item, value);
    const date =  this.validateTimeString(timeString);
    root[key] = date.getMinutes();
  }

  public $seconds (item: any, key: string, value: string, root: any) {
    const timeString: string = this.getItemProperty(item, value);
    const date =  this.validateTimeString(timeString);
    root[key] = date.getSeconds();
  }

  public $dayOfWeek (item: any, key: string, value: string, root: any) {
    const timeString: string = this.getItemProperty(item, value);
    const date =  this.validateTimeString(timeString);
    root[key] = date.getDay();
  }

  public $dayOfYear (item: any, key: string, value: string, root: any) {
    const timeString: string = this.getItemProperty(item, value);
    const date =  this.validateTimeString(timeString);
    root[key] = getDayOfYear(date);
  }

  public $week (item: any, key: string, value: string, root: any) {
    const timeString: string = this.getItemProperty(item, value);
    const date =  this.validateTimeString(timeString);
    root[key] = getWeek(date);
  }

  public $timestamp (item: any, key: string, value: string, root: any) {
    const timeString: string = this.getItemProperty(item, value);
    const date =  this.validateTimeString(timeString);
    root[key] = date.getTime();
  }

  protected validateTimeString(timeString: string): Date {
    const validationResult: any = validateTimeString(timeString);
    if ( !validationResult || validationResult.error ) {
      throw  ErrorFactory.transformError(validationResult.error.message);
    }
    return new Date(timeString);
  }

}
