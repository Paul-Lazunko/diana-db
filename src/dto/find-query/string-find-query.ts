export type StringFindQuery = {
  $eq?: string;
  $ne?: string;
  $cn?: string;
  $nc?: string;
  $startsWith?: string;
  $endsWith?: string;
  $notStartsWith?: string;
  $notEndsWith?: string;
  $in?: string[];
  $nin?: string;
};
