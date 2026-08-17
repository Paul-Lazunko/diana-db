export type QueryOperands<T> = {
  $eq?: T;
  $ne?: T;
  $in?: T[];
  $nin?: T[];
  $gt?: T;
  $gte?: T;
  $lt?: T;
  $lte?: T;
  $regex?: T;
  $contains?: T;
  $startsWith?: T;
  $endsWith?: T;
};
