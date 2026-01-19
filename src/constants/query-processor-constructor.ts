import {
  BooleanQueryProcessor,
  NumberQueryProcessor,
  StringQueryProcessor,
  TimeQueryProcessor,
  ReferenceQueryProcessor,
  ObjectIdQueryProcessor,
  PositionQueryProcessor,
} from '@query-processor';

export const QueryProcessorConstructor = {
  BOOLEAN: BooleanQueryProcessor,
  STRING: StringQueryProcessor,
  OBJECT_ID: ObjectIdQueryProcessor,
  NUMBER: NumberQueryProcessor,
  TIME: TimeQueryProcessor,
  REFERENCE: ReferenceQueryProcessor,
  POSITION: PositionQueryProcessor,
};
