import { ErrorFactory } from "../error";

const objectFirstKeyHelper = (item: any) => {
  const keys: string[] = Object.keys(item);
  if ( !keys.length ) {
    throw ErrorFactory.transformError(`transformed element has not any key`)
  } else if ( keys.length > 1 ) {
    throw ErrorFactory.transformError(`transformed element has more than one key`)
  }
  return keys[0];
};

export { objectFirstKeyHelper };
