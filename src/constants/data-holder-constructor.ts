import {
  BooleanHolder,
  StringHolder,
  TimeHolder,
  NumberHolder,
  ReferenceHolder,
  ObjectIdHolder,
  PositionDataHolder,
} from '@data-holder';

export const DataHolderConstructor = {
  BOOLEAN: BooleanHolder,
  STRING: StringHolder,
  OBJECT_ID: ObjectIdHolder,
  NUMBER: NumberHolder,
  TIME: TimeHolder,
  REFERENCE: ReferenceHolder,
  POSITION: PositionDataHolder,
};
