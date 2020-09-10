import { arrayConcatenation, arrayIntersection } from '../helpers';
import { BaseQueryProcessor } from './BaseQueryProcessor';

export class StringQueryProcessor extends BaseQueryProcessor<string> {

    protected $regex(value: RegExp) {
        const ids: string[][] = [];
        const keys: string[] = Array.from(this.rawDataKeys.keys());
        const compared: string[] = keys.filter((key: string) => key.match(value));
        for ( let i =0; i < compared.length; i = i + 1 ) {
            ids.push(this.rawDataKeys.get(compared[i]));
        }
        return arrayConcatenation(...ids);
    }
}
