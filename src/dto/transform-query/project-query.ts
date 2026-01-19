type NotObject = string | number;

export type ProjectQueryItem = {
  $max?: NotObject;
  $min?: NotObject;
  $avg?: NotObject;
  $sum?: NotObject[];
  $subtract?: NotObject[];
  $divide?: NotObject[];
  $multiply?: NotObject[];
  $ifNull?: NotObject[];
  $push?: NotObject;
  $addToSet?: NotObject[];
  $concatArray?: string;
  $first?: string;
  $concat?: {
    delimiter: string;
    parts: string[];
  };
  $year?: string;
  $month?: string;
  $date?: string;
  $hours?: string;
  $minutes?: string;
  $seconds?: string;
  $dayOfWeek?: string;
  $dayOfYear?: string;
  $timestamp?: string;
  $round?: number;
};

export type ProjectQuery = Partial<Record<string, any | ProjectQueryItem>> | Record<string, ProjectQueryItem>;
