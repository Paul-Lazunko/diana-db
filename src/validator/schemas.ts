import { Types, UnitOfTime, Weekday } from '@const';
import { disallow } from 'joi';

const joi = require('joi');

const configurationOptions = joi.object({
  port: joi.number().positive().integer().min(1025).max(65535).required(),
  transactionsMinAutoRollBackValue: joi.number().positive().integer(),
  transactionsMaxAutoRollBackValue: joi.number().positive().integer(),
  dumpCreateInterval: joi.string().valid('day', 'hour'),
  dumpDirectory: joi.string().regex(/^(^[\/]{1})|(^[\.]{1,2})\//),
  logsDirectory: joi.string().regex(/^(^[\/]{1})|(^[\.]{1,2})\//),
  logsTtlValue: joi.string().regex(/^\d+d$/),
  currentDumpName: joi.string(),
  backupName: joi.string(),
  storeStrategy: joi.string().valid('s3', 'local').required(),
  s3: joi
    .object({
      region: joi.string(),
      bucket: joi.string(),
      endpoint: joi.string(),
      credentials: joi.object({
        accessKeyId: joi.string(),
        secretAccessKey: joi.string(),
      }),
    })
    .when('storeStrategy', {
      is: 's3',
      then: joi.required(),
      otherwise: joi.optional(),
    }),
  tls: joi.object({
    cert: joi.string(),
    key: joi.string(),
    ca: joi.string(),
    rejectUnauthorized: joi.boolean(),
    requestCert: joi.boolean(),
  }),
  logger: joi.string().valid('winston', 'console'),
  wal: joi.object({
    enabled: joi.boolean(),
    fsync: joi.boolean(),
  }),
  cert: joi.string(),
  key: joi.string(),
});

const pointer = joi.string().regex(/^\$[A-Za-z]+[A-Za-z0-9_]+/);

export const clientOptions = joi.object({
  port: joi.number().positive().integer().min(1025).max(65535).required(),
  host: joi.string().required(),
  user: joi.string().required(),
  password: joi.string().required(),
  connectionPoolSize: joi.number().positive().integer().min(1),
  connectTimeoutValue: joi.number().positive().integer().min(100),
});

const numberFieldExtended = joi.alternatives(
  joi.number(),
  pointer,
  joi.object({
    $add: joi.number(),
    $subtract: joi.number(),
    $multiply: joi.number(),
    $divide: joi.number().disallow(0),
    $round: joi.number().positive().integer().min(0).max(8),
  }),
);

const stringField = joi.alternatives(
  joi.string(),
  pointer,
  joi.object({
    $concat: joi.object({
      delimiter: joi.string().required(),
      parts: joi.array().items(joi.string()),
    }),
    $replace: joi.array().min(3).max(3).items(joi.string()),
  }),
);
const objectIdField = joi.alternatives(
  pointer,
  joi.string().regex(/^[0-9a-f]{12}-[0-9a-f]{1,}-[0-9a-f]{11}-[0-9a-f]{9}$/),
);

const timeFieldItem = joi.object({
  amount: joi.number().positive().integer().required(),
  unit: joi
    .string()
    .valid(...Object.values(UnitOfTime))
    .required(),
});

const weekday = joi.string().valid(...Object.values(Weekday));

const unitOfTime = joi.string().valid(...Object.values(UnitOfTime));

const timeField = joi.alternatives(
  joi.string().isoDate(),
  joi.number().positive().integer(),
  pointer,
  joi
    .object({
      $add: timeFieldItem,
      $subtract: timeFieldItem,
      $toStartOf: unitOfTime,
      $toEndOf: unitOfTime,
      $toNextWeekday: weekday,
      $toLastWeekday: weekday,
    })
    .min(1),
);
const booleanField = joi.alternatives(joi.boolean().allow(true, false), pointer);

const geoField = joi.alternatives(
  joi.object({
    x: joi.number().required(),
    y: joi.number().required(),
  }),
  pointer,
);

const arrayExtended = joi
  .object({
    $addItem: joi.any(),
    $removeItem: joi.any(),
  })
  .min(1)
  .max(1);

const arrayOfNumberField = joi.alternatives(joi.array().items(numberFieldExtended), arrayExtended);
const arrayOfStringField = joi.alternatives(joi.array().items(stringField), arrayExtended);
const arrayOfBooleanField = joi.array().items(booleanField);
const arrayOfTimeField = joi.array().items(timeField);
const arrayOfObjectIdField = joi.array().items(objectIdField);
const arrayOfGeoField = joi.array().items(geoField);

const numberQuery = joi.alternatives().try(
  joi.object({
    $in: joi.array().items(joi.number()),
    $nin: joi.array().items(joi.number()),
    $eq: joi.number(),
    $ne: joi.number(),
    $lt: joi.number(),
    $gt: joi.number(),
    $lte: joi.number(),
    $gte: joi.number(),
  }),
  joi.number(),
);

const geoQuery = joi.object({
  $insideCircle: joi.object({
    center: geoField.required(),
    radius: joi.number().positive().required(),
  }),
  $outsideCircle: joi.object({
    center: geoField.required(),
    radius: joi.number().positive().required(),
  }),
  $insidePolygon: joi.array().items(geoField).min(3),
  $outsidePolygon: joi.array().items(geoField).min(3),
  $nearLines: joi.object({
    lines: joi.array().items(joi.array().items(geoField).min(2).max(2)).min(1).required(),
    distance: joi.number().positive().required(),
  }),
  $farFromLines: joi.object({
    lines: joi.array().items(joi.array().items(geoField).min(2).max(2)).min(1).required(),
    distance: joi.number().positive().allow(0).required(),
  }),
});

const stringQuery = joi.alternatives().try(
  joi.object({
    $regex: joi.string(),
    $in: joi.array().items(joi.string()),
    $nin: joi.array().items(joi.string()),
    $eq: joi.string(),
    $ne: joi.string(),
    $startsWith: joi.string(),
    $notStartsWith: joi.string(),
    $endsWith: joi.string(),
    $notEndsWith: joi.string(),
    $cn: joi.string(),
    $nc: joi.string(),
  }),
  joi.string(),
);

const objectIdQuery = joi.alternatives().try(
  joi
    .object({
      $in: joi.array().items(objectIdField),
      $nin: joi.array().items(objectIdField),
      $eq: objectIdField,
      $ne: objectIdField,
      $subQuery: joi.any(),
    })
    .min(1)
    .max(1),
  objectIdField,
);

const booleanQuery = joi.alternatives().try(
  joi
    .object({
      $in: joi.array().items(joi.boolean()),
      $nin: joi.array().items(joi.boolean()),
      $eq: joi.boolean(),
      $ne: joi.boolean(),
    })
    .min(1)
    .max(1),
  joi.boolean(),
);

const timeQuery = joi
  .object({
    $year: numberQuery,
    $month: numberQuery,
    $week: numberQuery,
    $date: numberQuery,
    $hours: numberQuery,
    $minutes: numberQuery,
    $seconds: numberQuery,
    $dayOfWeek: numberQuery,
    $dayOfYear: numberQuery,
    $timestamp: numberQuery,
    $raw: stringQuery,
  })
  .min(1);

const schemaItem = joi
  .object({
    type: joi
      .string()
      .valid(...Object.values(Types))
      .required(),
    items: joi
      .when('type', {
        is: Types.ARRAY,
        then: joi
          .string()
          .valid(...Object.values(Types))
          .required(),
      })
      .when('type', {
        not: Types.ARRAY,
        then: joi.forbidden(),
      }),
    uppercase: joi
      .when('type', {
        is: Types.STRING,
        then: joi.boolean(),
      })
      .when('type', {
        not: Types.STRING,
        then: joi.forbidden(),
      }),
    lowercase: joi
      .when('type', {
        is: Types.STRING,
        then: joi.boolean(),
      })
      .when('type', {
        not: Types.STRING,
        then: joi.forbidden(),
      }),
    precision: joi
      .when('type', {
        is: Types.NUMBER,
        then: joi.number().positive().integer().allow(0).min(0).max(8), // optional: no precision = stored as-is
      })
      .when('items', {
        is: Types.NUMBER,
        then: joi.number().positive().integer().allow(0).min(0).max(8), // optional: no precision = stored as-is
      }),
    reference: joi
      .when('type', {
        is: Types.REFERENCE,
        then: joi.string().required(),
      })
      .when('items', {
        is: Types.REFERENCE,
        then: joi.string().required(),
      }),
    required: joi.boolean(),
    unique: joi.boolean(),
    mutable: joi.boolean(),
    ttl: joi
      .when('type', {
        not: Types.TIME,
        then: joi.forbidden(),
      })
      .when('type', {
        is: Types.TIME,
        then: joi.number().positive().integer().min(5),
      }),
    triggerRemove: joi.when('type', {
      is: Types.REFERENCE,
      then: joi.boolean(),
      otherwise: joi.any().when('type', {
        is: Types.ARRAY,
        then: joi.any().when('items', {
          is: Types.REFERENCE,
          then: joi.boolean(),
          otherwise: joi.forbidden(),
        }),
        otherwise: joi.forbidden(),
      }),
    }),
  })
  .oxor('lowercase', 'uppercase')
  .min(1);

const projectionSchema = joi
  .object({
    $sum: joi.array().items(joi.number(), pointer),
    $subtract: joi.array().items(joi.number(), pointer),
    $divide: joi.array().items(joi.number().disallow(0), pointer),
    $multiply: joi.array().items(joi.number(), pointer),
    $ifNull: joi.array().items(joi.number(), pointer),
    $max: pointer,
    $min: pointer,
    $avg: pointer,
    $push: joi.any(),
    $addToSet: joi.any(),
    $concatArray: pointer,
    $first: pointer,
    $last: pointer,
    $concat: joi.object({
      delimiter: joi.string().required(),
      parts: joi.array().items(joi.string()),
    }),
    $year: pointer,
    $month: pointer,
    $date: pointer,
    $hours: pointer,
    $minutes: pointer,
    $seconds: pointer,
    $dayOfWeek: pointer,
    $dayOfYear: pointer,
    $timestamp: pointer,
    $round: joi.number().positive().integer().min(0).max(8),
  })
  .min(1)
  .max(1);

const transformQueries = joi.array().items(
  joi
    .object({
      $lookup: joi.object({
        collection: joi.string().required(),
        database: joi.string(),
        as: joi.string().required(),
        localField: joi.string().required(),
        foreignField: joi.string().required(),
        filter: joi.any(),
        replaceRoot: pointer,
        sort: joi.object().pattern(/^/, joi.number().integer().allow(-1, 1)).min(1),
        skip: joi.number().positive().integer().allow(0),
        limit: joi.number().positive().integer(),
      }),
      $match: joi
        .object()
        .pattern(/^/, joi.alternatives(booleanQuery, stringQuery, numberQuery, timeQuery, geoQuery, objectIdQuery)),
      $sort: joi.object().pattern(/^/, joi.number().integer().allow(-1, 1)).min(1),
      $unwind: pointer,
      $replaceRoot: pointer,
      $group: joi
        .object({
          _id: joi.any().required(),
        })
        .pattern(/^(?!.*\_id$)/, joi.alternatives(projectionSchema, pointer, joi.boolean())),
      $project: joi
        .object()
        .pattern(/^/, joi.alternatives(projectionSchema, joi.string(), joi.boolean()))
        .min(1),
      $skip: joi.number().positive().integer().allow(0),
      $limit: joi.number().positive().integer(),
    })
    .max(1),
);

const sortQuery = joi.alternatives(
  joi.number().integer().allow(-1, 1),
  joi.object().pattern(/^/, joi.number().integer().allow(-1, 1)).min(1),
);

export {
  configurationOptions,
  numberFieldExtended,
  stringField,
  timeField,
  booleanField,
  objectIdField,
  arrayOfBooleanField,
  arrayOfNumberField,
  arrayOfStringField,
  arrayOfTimeField,
  arrayOfObjectIdField,
  stringQuery,
  objectIdQuery,
  numberQuery,
  booleanQuery,
  timeQuery,
  schemaItem,
  transformQueries,
  geoField,
  arrayOfGeoField,
  geoQuery,
  sortQuery,
};
