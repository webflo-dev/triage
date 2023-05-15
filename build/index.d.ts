export interface Transducer {
    'init'?: <T>(initialValue?: T) => Iterable<T> | {
        [key: string]: T;
    } | void;
    'step'?: <TInput, TResult>(accumulated: TResult, current: TInput, index?: number) => TResult | Reduced<TResult>;
    'value'?: <TResult>() => TResult;
    'result'?: <TResult>(result: TResult) => TResult;
    '@@transducer/init'?: <T>(initialValue?: T) => Iterable<T> | {
        [key: string]: T;
    } | void;
    '@@transducer/step'?: <TInput, TResult>(accumulated: TResult, current: TInput) => TResult | Reduced<TResult>;
    '@@transducer/value'?: <TResult>() => TResult;
    '@@transducer/result'?: <TResult>(result: TResult) => TResult;
}
export declare type CollectionInput<TInput> = (TInput | TInput[])[] | Iterable<TInput> | {
    [key: string]: TInput;
};
export declare type CollectionResult<TResult> = TResult | Iterable<TResult> | {
    [key: string]: TResult;
};
export declare type Partial<TInput, TResult> = (collection: CollectionInput<TInput>) => CollectionResult<TResult>;
export declare type PartialSeq<TInput, TResult> = Partial<TInput, TResult>;
export declare type PartialInto<TInput, TResult> = Partial<TInput, TResult>;
export interface Reduced<TResult> {
    ['@@transducer/reduced']: boolean;
    ['@@transducer/value']: TResult;
}
declare function into<TInput, TResult>(to: CollectionResult<TResult>, transformer: (reducer: Transducer) => Transducer): PartialSeq<TInput, TResult>;
declare function into<TInput, TResult>(to: CollectionResult<TResult>, transformer: (reducer: Transducer) => Transducer, collection: CollectionInput<TInput>): CollectionResult<TResult>;
declare function seq<TInput, TResult>(transformer: (reducer: Transducer) => Transducer): PartialInto<TInput, TResult>;
declare function seq<TInput, TResult>(transformer: (reducer: Transducer) => Transducer, collection?: CollectionInput<TInput>): CollectionResult<TResult>;
declare const _default: {
    FilterReducer: <TInput, TResult>(predicate: (curr: TInput, acc: TResult, index: number) => boolean, reducer: Transducer) => Transducer;
    MapReducer: <TInput_1, TResult_1>(fn: (curr: TInput_1, index: number, acc: TResult_1) => TResult_1 | Reduced<TResult_1>, reducer: Transducer) => Transducer;
    ReduceReducer: <TInput_2, TResult_2>(fn: (accumulated: TResult_2 | Reduced<TResult_2>, current: TInput_2) => TResult_2 | Reduced<TResult_2>, initial: TResult_2 | Reduced<TResult_2>, reducer: Transducer) => Transducer;
    WhileReducer: <TInput_3, TResult_3>(predicate: (curr: TInput_3, index: number, acc: TResult_3) => boolean, reducer: Transducer) => Transducer;
    StandardReducer: (description: any) => Transducer;
    defaultReducerProps: (reducer: any) => {
        '@@transducer/init': (...args: any[]) => any;
        '@@transducer/result': (arg: any) => any;
    };
    Reduced: <TResult_4>(value: any) => Reduced<TResult_4>;
    isReduced: <TResult_5>(result: TResult_5 | Reduced<TResult_5>) => boolean;
    map: <TInput_4, TResult_6>(fn: (curr: TInput_4, index: number, acc: TResult_6) => TResult_6 | Reduced<TResult_6>) => (reducer: Transducer) => Transducer;
    flatMap: <TInput_5, TResult_7>(fn: (curr: TInput_5) => TResult_7 | Reduced<TResult_7>) => (reducer: Transducer) => Transducer;
    filter: <TInput_6, TResult_8>(predicate: (curr: TInput_6, acc: TResult_8, index: number) => boolean) => (reducer: Transducer) => Transducer;
    reduce: <TInput_7, TResult_9>(fn: (accumulated: TResult_9 | Reduced<TResult_9>, current: TInput_7) => TResult_9 | Reduced<TResult_9>, initial: TResult_9 | Reduced<TResult_9>) => (reducer: Transducer) => Transducer;
    dedupe: <T>(allValues?: boolean, lastValue?: T) => (reducer: Transducer) => Transducer;
    take: (count?: number) => (reducer: Transducer) => Transducer;
    skip: (count?: number) => (reducer: Transducer) => Transducer;
    takeUntil: <TInput_8, TResult_10>(predicate: (curr: TInput_8, acc: TResult_10) => boolean) => (reducer: Transducer) => Transducer;
    skipWhile: <TInput_9, TResult_11>(predicate: (curr: TInput_9, acc: TResult_11) => boolean, state?: boolean) => (reducer: Transducer) => Transducer;
    transduce: <TInput_10, TResult_12>(transformer: (reducer: Transducer) => Transducer, reducer: Transducer, initialValue: CollectionResult<TResult_12>, collection: CollectionInput<TInput_10>) => CollectionResult<TResult_12>;
    into: typeof into;
    seq: typeof seq;
};
export default _default;
//# sourceMappingURL=index.d.ts.map