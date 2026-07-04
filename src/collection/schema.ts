import { Types } from '@const';

export type FieldDefinition = {
  type: Types;
  items: Exclude<Types, 'ARRAY'>;
  required?: boolean;
  unique?: true;
  mutable?: boolean;
};

export type ArrayFieldDefinition = Omit<FieldDefinition, 'type' | 'ttl'> & {
  type: Types.ARRAY;
  reference?: string;
  triggerRemove?: boolean;
};

export type TimeFieldDefinition = Omit<FieldDefinition, 'type' | 'items'> & {
  type: Types.TIME;
  ttl?: number;
};

export type ReferenceFieldDefinition = Omit<FieldDefinition, 'type' | 'items'> & {
  type: Types.REFERENCE;
  reference: string;
  triggerRemove?: boolean;
};
export type PositionFieldDefinition = Omit<FieldDefinition, 'type' | 'items'> & {
  type: Types.POSITION;
};

export type ObjectIdFieldDefinition = Omit<FieldDefinition, 'type' | 'items'> & {
  type: Types.OBJECT_ID;
  reference?: string;
  triggerRemove?: boolean;
};

export type BooleanFieldDefinition = Omit<FieldDefinition, 'type' | 'items'> & {
  type: Types.STRING | Types.BOOLEAN;
};

export type StringFieldDefinition = Omit<FieldDefinition, 'type' | 'items'> & {
  type: Types.STRING | Types.BOOLEAN;
  uppercase?: boolean;
  lowercase?: boolean;
};

export type NumberFieldDefinition = Omit<FieldDefinition, 'type' | 'items'> & {
  type: Types.NUMBER;
  precision: number;
};

export interface Schema<T extends Record<string, any>> {
  [key: string]:
    | BooleanFieldDefinition
    | StringFieldDefinition
    | ReferenceFieldDefinition
    | ObjectIdFieldDefinition
    | ArrayFieldDefinition
    | NumberFieldDefinition
    | PositionFieldDefinition
    | TimeFieldDefinition;
}
