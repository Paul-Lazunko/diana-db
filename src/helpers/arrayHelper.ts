export const arrayIntersection = (...args: any[]): any[] => {
    if ( !args.length ) {
        return [];
    }
    if ( args.length === 1 ) {
        return args[0];
    }
    let base = [];
    for ( let i = 0; i < args.length; i = i + 1 ) {
        if ( Array.isArray( args[i]) && (!base.length || base.length > args[i].length) ) {
            base = Object.assign([], args[i]);
        }
    }
    const result = [];
    while ( base.length ) {
        const item = base.pop();
        let addToResult = true;
        for ( let i = 0; i < args.length; i = i + 1 ) {
            if ( !addToResult ) {
                break;
            }
            addToResult = addToResult && Array.isArray( args[i]) && args[i].includes(item);
        }
        if ( addToResult ) {
            result.push(item);
        }
    }
    return result;
};

export const arrayConcatenation = (...args: any[]): any[] => {
    let base: any[] = [];
    for ( let i = 0; i < args.length; i = i + 1 ) {
        if ( Array.isArray( args[i]) ) {
            base = base.concat(...args[i]);
        }
    }
    return Array.from(new Set(base));
};

export const arrayExcluding = (...args: any[]): any[] => {
  const [ base, exclude ] = args;
  for ( let i = 0; i < exclude.length; i = i + 1 ) {
    if ( base.includes(exclude[i]) ) {
      base.splice(base.indexOf(exclude[i], 1));
    }
  }
  return base;
};


export const arrayEqualityCompare = (baseArray: any[], compareArray: any[]): boolean => {
    return JSON.stringify(baseArray) === JSON.stringify(compareArray);
};
