import {
  BooleanQueryProcessor,
  NumberQueryProcessor,
  StringQueryProcessor,
  TimeQueryProcessor,
  ReferenceQueryProcessor,
  ObjectIdQueryProcessor,
  GeoQueryProcessor
} from '../queryProcessor';

export const EQueryProcessorConstructor  = {
  BOOLEAN: BooleanQueryProcessor,
  STRING:  StringQueryProcessor,
  OBJECT_ID:  ObjectIdQueryProcessor,
  NUMBER: NumberQueryProcessor,
  TIME: TimeQueryProcessor,
  REFERENCE: ReferenceQueryProcessor,
  POSITION: GeoQueryProcessor
};
