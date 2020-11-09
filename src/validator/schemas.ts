import { Types } from '../constants';
const joi = require('joi');

const configurationOptions = joi.object({
  port: joi.number().positive().integer().min(1025).max(65535),
  workersCount: joi.number().positive().integer().min(1),
  transactionsMinAutoRollBackValue: joi.number().positive().integer(),
  transactionsMaxAutoRollBackValue: joi.number().positive().integer(),
  dumpCreateInterval: joi.string().valid('day', 'hour'),
  dumpDirectory: joi.string().regex(/^(^[\/]{1})|(^[\.]{1,2})\//),
  logsDirectory: joi.string().regex(/^(^[\/]{1})|(^[\.]{1,2})\//),
  logsTtlValue: joi.string().regex(/^\d+d$/).required(),
  currentDumpName: joi.string().regex(/\.json$/),
  secretKey: joi.string().required()
});

const numberField = joi.number();
const numberFieldExtended = joi.alternatives(joi.number(), joi.object({
  $inc: joi.number().positive(),
  $decr: joi.number().positive()
}));
const stringField = joi.string();
const objectIdField = joi.string().regex(/^[0-9a-fA-F]{36}$/);
const timeField = joi.string().isoDate();
const booleanField = joi.boolean().allow(true, false);
const geoField = joi.object({
  x: joi.number().required(),
  y: joi.number().required(),
});
const arrayOfNumberField = joi.array().items(numberField);
const arrayOfStringField = joi.array().items(stringField);
const arrayOfBooleanField = joi.array().items(booleanField);
const arrayOfTimeField = joi.array().items(timeField);
const arrayOfObjectIdField = joi.array().items(objectIdField);
const arrayOfGeoField = joi.array().items(geoField);

const numberQuery = joi.object({
  $in: joi.array().items(joi.number()),
  $nin: joi.array().items(joi.number()),
  $eq: joi.number(),
  $ne: joi.number(),
  $lt: joi.number(),
  $gt: joi.number(),
  $lte: joi.number(),
  $gte: joi.number()
});

const geoQuery = joi.object({
  $insideCircle: joi.object({
    center: geoField.required(),
    radius: joi.number().positive().required()
  }),
  $outsideCircle: joi.object({
    center: geoField.required(),
    radius: joi.number().positive().required()
  }),
  $insidePolygon: joi.array().items(geoField).min(3),
  $outsidePolygon: joi.array().items(geoField).min(3),
  $nearLines: joi.object({
    lines: joi.array().items(joi.array().items(geoField).min(2).max(2)).min(1).required(),
    distance: joi.number().positive().required()
  }),
  $farFromLines: joi.object({
    lines: joi.array().items(joi.array().items(geoField).min(2).max(2)).min(1).required(),
    distance: joi.number().positive().allow(0).required()
  })
});

const stringQuery = joi.object({
  $regex: joi.string(),
  $in: joi.array().items(joi.string()),
  $nin: joi.array().items(joi.string()),
  $eq: joi.string(),
  $ne: joi.string()
});

const objectIdQuery = joi.object({
  $in: joi.array().items(objectIdField),
  $nin: joi.array().items(objectIdField),
  $eq: objectIdField,
  $ne: objectIdField,
  $subQuery: joi.any()
});

const booleanQuery = joi.object({
  $in: joi.array().items(joi.boolean()),
  $nin: joi.array().items(joi.boolean()),
  $eq: joi.boolean(),
  $ne: joi.boolean()
});

const timeQuery = joi.object({
  $year: numberQuery,
  $month: numberQuery,
  $date: numberQuery,
  $hours: numberQuery,
  $minutes: numberQuery,
  $seconds: numberQuery,
  $dayOfWeek: numberQuery,
  $dayOfYear: numberQuery,
  $timestamp: numberQuery,
  $raw: stringQuery,
});

const schemaItem = joi.object({
  type: joi.string().valid(...Object.values(Types)).required(),
  items: joi
    .when('type',{
      is: Types.ARRAY,
      then: joi.string().valid(...Object.values(Types)).required()
    }).when('type',{
      not: Types.ARRAY,
      then: joi.forbidden
    }),
  reference: joi
    .when('type',{
      is: Types.REFERENCE,
      then: joi.string().required()
    })
    .when('items',{
      is: Types.REFERENCE,
      then: joi.string().required()
    }),
  isRequired: joi.boolean(),
  isUnique: joi.boolean(),
  isMutable: joi.boolean(),
  ttl: joi
    .when('type', {
      not: Types.TIME,
      then: joi.forbidden()
    })
    .when('type', {
      is: Types.TIME,
      then: joi.number().positive().integer().min(5)
    }),
  triggerRemove: joi
    .when('type',{
      is: Types.REFERENCE,
      then: joi.boolean()
    })
    .when('type',{
      not: Types.REFERENCE,
      then: joi.forbidden()
    })
}).min(1);


const projectionSchema = joi.object({
  $sum: joi.array().items(joi.string(), joi.number(), joi.any()),
  $subtract: joi.array().items(joi.string(), joi.number(), joi.any()),
  $divide: joi.array().items(joi.string(), joi.number(), joi.any()),
  $multiply: joi.array().items(joi.string(), joi.number(), joi.any()),
  $ifNull: joi.array().items(joi.string(), joi.number(), joi.any()),
  $push: joi.any(),
  $addToSet: joi.any(),
  $concatArray: joi.string(),
  $first: joi.string(),
  $concatString: joi.object({
    delimiter: joi.string().required(),
    localField: joi.string()
  }),
  $year: joi.string(),
  $month: joi.string(),
  $date: joi.string(),
  $hours: joi.string(),
  $minutes: joi.string(),
  $seconds: joi.string(),
  $dayOfWeek: joi.string(),
  $dayOfYear: joi.string(),
  $timestamp: joi.string(),
}).max(1);

const transformQueries = joi.array().items(joi.object({
  $lookUp: joi.object({
    collection: joi.string().required(),
    database: joi.string(),
    as: joi.string().required(),
    localField: joi.string().required(),
    foreignField: joi.string().required(),
    filter: joi.any()
  }),
  $match: joi.object().pattern(/^/, joi.object({
    $in: joi.array().items(joi.any()),
    $nin: joi.array().items(joi.number()),
    $eq: joi.any(),
    $ne: joi.any(),
    $lt: joi.number(),
    $gt: joi.number(),
    $lte: joi.number(),
    $gte: joi.number(),
    $contains: joi.alternatives(joi.string(), joi.array().items(joi.any()))
  })),
  $unwind: joi.string(),
  $replaceRoot: joi.string(),
  $group: joi.object({
    _id: joi.string().required(),
  }).pattern(/^(?!.*\_id$)/, joi.alternatives(projectionSchema, joi.string(), joi.boolean())),
  $project: joi.object().pattern(/^/, joi.alternatives(projectionSchema, joi.string(), joi.boolean()))
}).max(1));

const sortQuery = joi.alternatives(
  joi.number().integer().allow(-1, 1),
  joi.object().pattern(/^/, joi.number().integer().allow(-1, 1))
);

export {
  configurationOptions,
  numberField,
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
  sortQuery
};
