import {
  BooleanHolder,
  StringHolder,
  TimeHolder,
  NumberHolder,
  ReferenceHolder,
  ObjectIdHolder,
  GeoDataHolder
} from '../dataholder';

export const EDataHolderConstructor = {
  BOOLEAN:  BooleanHolder,
  STRING:  StringHolder,
  OBJECT_ID:  ObjectIdHolder,
  NUMBER:  NumberHolder,
  TIME: TimeHolder,
  REFERENCE: ReferenceHolder,
  GEO: GeoDataHolder
}
