export interface ITimeQueryProcessorOptionsKeys {
     year: Map<number, string[]>;
     month: Map<number, string[]>;
     date: Map<number, string[]>;
     hours: Map<number, string[]>;
     minutes: Map<number, string[]>;
     seconds: Map<number, string[]>;
     week: Map<number, string[]>;
     dayOfWeek: Map<number, string[]>;
     dayOfYear: Map<number, string[]>;
     timestamp: Map<number, string[]>;
     raw: Map<string, string[]>;
}

export interface ITimeQueryProcessorOptionsValues {
    year: Map<string, number>;
    month: Map<string, number>;
    date: Map<string, number>;
    hours: Map<string, number>;
    minutes: Map<string, number>;
    seconds:Map<string, number>;
    week: Map<string, number>;
    dayOfWeek: Map<string, number>;
    dayOfYear: Map<string, number>;
    timestamp: Map<string, number>;
    raw: Map<string, string>;
}