import {IDataHolderMethodsParams} from '../params';
import {IQuery} from './IQuery';

export interface IDataHolder {

    createCursor: (params: IQuery) => string[]
    create: (params: IDataHolderMethodsParams<any>) => void
    remove: (params: IDataHolderMethodsParams<any>) => void
    update: (query: IDataHolderMethodsParams<any>, data: IDataHolderMethodsParams<any>) => void
    get: (params: string[]) => { [key: string]: any }
    store: () => any
    restore: (data:any) => void

}
