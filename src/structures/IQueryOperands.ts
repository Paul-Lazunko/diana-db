export interface IQueryOperands<T> {
    $eq?: T,
    $ne?: T,
    $in?: T[],
    $nin?: T[],
    $gt?: T,
    $gte?: T,
    $lt?: T,
    $lte?: T,
    $cs?: T,
    $ns?: T
}
