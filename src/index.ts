const isArray = Array.isArray;
const isObject = ( theObject: any ) : boolean => theObject instanceof Object && Object.getPrototypeOf( theObject ) === Object.getPrototypeOf({});
const ensureArray = <T>( theArray: T | T[] ): T[] => isArray( theArray ) ? theArray : ( theArray != null ? [theArray] : []);

export interface Transducer{
  'init'?: <T>(initialValue?: T) => Iterable<T> | {[key:string]: T} | void
  'step'?: <TInput, TResult>(accumulated: TResult, current: TInput, index?:number) => TResult | Reduced<TResult>
  'value'?: <TResult>() => TResult
  'result'?: <TResult>(result:TResult) => TResult
  '@@transducer/init'?: <T>(initialValue?: T) => Iterable<T> | {[key:string]: T} | void
  '@@transducer/step'?: <TInput, TResult>(accumulated: TResult, current: TInput) => TResult | Reduced<TResult>
  '@@transducer/value'?: <TResult>() => TResult
  '@@transducer/result'?: <TResult>(result:TResult) => TResult
}

export type CollectionInput<TInput> = (TInput|TInput[])[] | Iterable<TInput> | {[key:string]: TInput}
export type CollectionResult<TResult> = TResult | Iterable<TResult> | {[key:string]: TResult}
export type Partial<TInput, TResult> = ( collection: CollectionInput<TInput> ) => CollectionResult<TResult>
export type PartialSeq<TInput, TResult> = Partial<TInput, TResult>;
export type PartialInto<TInput, TResult> = Partial<TInput, TResult>

//*******************************************
// utils
//*******************************************

const init = obj => obj['@@transducer/init'] || obj.init;
const step = (obj:Transducer) => obj['@@transducer/step'] || obj.step;
const value = obj => obj['@@transducer/value'] || obj.value;
const result = (obj: Transducer) => obj['@@transducer/result'] || obj.result;

const StandardReducer = ( description ): Transducer=> ({
  'init': description.init || description['@@transducer/init'],
  'step': description.step || description['@@transducer/step'],
  'value': description.value || description['@@transducer/value'],
  'result': description.result || description['@@transducer/result'],
  '@@transducer/init': description['@@transducer/init'] || description.init,
  '@@transducer/step': description['@@transducer/step'] || description.step,
  '@@transducer/value': description['@@transducer/value'] || description.value,
  '@@transducer/result': description['@@transducer/result'] || description.result,
});

export interface Reduced<TResult> {
  ['@@transducer/reduced']: boolean;
  ['@@transducer/value']: TResult;
}
const Reduced = <TResult>( value ): Reduced<TResult> => ({
  '@@transducer/reduced': true,
  '@@transducer/value': value
});

const isReduced = <TResult>( result: Reduced<TResult>| TResult ): boolean => result && result['@@transducer/reduced'];

const ObjectIterator = obj => {
  const keys = Object.keys( obj );
  let index = 0;
  return {
    next: () => {
      if ( index < keys.length ) {
        const res = {
          value: [ keys[index], obj[keys[index]] ],
          done: false
        };
        index++;
        return res;
      } else return { done : true };
    }
  };
};

const getIterator = ( collection ) => {
  if ( collection[Symbol.iterator]) return collection[Symbol.iterator]();
  if ( isObject( collection )) return ObjectIterator( collection );
  throw new Error( `Transducers: No Iterator for collection: ${collection}` );
};

const defaultReducerProps = reducer => ({
  '@@transducer/init': ( ...args ) => init( reducer )( ...args ),
  '@@transducer/result': ( arg ) => result( reducer )( arg )
});

//*******************************************
// Reducers
//*******************************************

const ArrayReducer = ()=> StandardReducer({
  '@@transducer/init': <T>(initialValue: T[]) => initialValue,
  '@@transducer/result': <T>(result: T[]): T[] => result,
  '@@transducer/step': <T>( array: T[], value: T ): T[] => { array.push( value ); return array ; },
});

const ObjectReducer = ()=>StandardReducer({
  '@@transducer/init': ( initialObject: object ): object => initialObject || {},
  '@@transducer/result': (result: object): object => result,
  '@@transducer/step': ( object:object, value:any[] | object ): void | (Record<any, any> & object) =>{
    if (isArray( value ) && value.length === 2){
      object[value[0]] = value[1]
    } else {
      Object.keys( value ).forEach(k=>{
        object[k] = value[k]
      })
    }
    return object;
  }
});

//*******************************************
// Transformer types
//*******************************************
const MapReducer = <TInput, TResult>( fn: (curr: TInput, index:number, acc: TResult) => TResult | Reduced<TResult>, reducer: Transducer ) => StandardReducer({
  ...defaultReducerProps( reducer ),
  '@@transducer/step': ( acc, curr, index ) => step( reducer )( acc, fn( curr, index, acc )),
});

const FlatMapReducer = <TInput, TResult>( fn: (curr: TInput) => TResult | Reduced<TResult>, reducer: Transducer ) => StandardReducer({
  ...defaultReducerProps( reducer ),
  '@@transducer/step': ( acc, curr ) => {
    for ( const c of ensureArray( curr )) {
      const reduced = step( reducer )( acc, fn( c ));
      if ( isReduced( reduced )) return reduced;
    }
    return acc;
  },
});

const FilterReducer = <TInput, TResult>( predicate: (curr: TInput, acc: TResult, index: number) => boolean, reducer: Transducer ) => StandardReducer({
  ...defaultReducerProps( reducer ),
  '@@transducer/step': ( acc, curr, index ) => predicate( curr, acc, index ) ? step( reducer )( acc, curr, index ) : acc,
});

const WhileReducer = <TInput, TResult>( predicate: (curr: TInput, index:number, acc: TResult) => boolean, reducer: Transducer ) => StandardReducer({
  ...defaultReducerProps( reducer ),
  '@@transducer/step': ( acc, curr, index ) => predicate( curr, acc, index ) ? step( reducer )( acc, curr, index ) : Reduced( acc )
});

const ReduceReducer = <TInput, TResult>( fn: (accumulated: TResult | Reduced<TResult>, current: TInput) => TResult | Reduced<TResult>, initial:TResult | Reduced<TResult>, reducer: Transducer ) => StandardReducer({
  ...defaultReducerProps( reducer ),
  '@@transducer/result': () => initial,
  '@@transducer/step': ( acc: CollectionResult<TResult>, curr: TInput, index:number ) => {
    initial = fn( initial, curr );
    return step( reducer )( acc, curr, index );
  },
});

//*******************************************
// operations
//*******************************************

const map = <TInput, TResult>(fn: (curr: TInput, index:number, acc: TResult) => TResult | Reduced<TResult>) => (reducer: Transducer) => MapReducer( fn, reducer );
const flatMap = <TInput, TResult>(fn: (curr: TInput) => TResult | Reduced<TResult>) => (reducer: Transducer) => FlatMapReducer( fn, reducer );
const reduce = <TInput, TResult>(  fn: (accumulated: TResult | Reduced<TResult>, current: TInput) => TResult | Reduced<TResult>, initial:TResult | Reduced<TResult> ) => (reducer: Transducer) => ReduceReducer( fn, initial, reducer );
const filter = <TInput, TResult>(predicate: (curr: TInput, acc: TResult, index:number) => boolean) => (reducer: Transducer) => FilterReducer( predicate, reducer );
const take = ( count = Infinity ) => (reducer: Transducer) => WhileReducer(() => count-- > 0, reducer );
const skip = ( count = 0 ) => (reducer: Transducer) => FilterReducer(() => count-- <= 0, reducer );
const takeUntil = <TInput, TResult>(predicate: ( curr: TInput, acc: TResult) => boolean) => (reducer: Transducer) => WhileReducer(( value: TInput, index:number, acc: TResult ) => predicate( value, acc ), reducer );
const dedupe = <T>( allValues? : boolean, lastValue?: T ) => (reducer: Transducer) => FilterReducer(( value: T, acc ) => {
  let notDuped;
  if ( !allValues ){
    notDuped = value !== lastValue;
    lastValue = value;
  } else {
    notDuped = !( Array.isArray( acc ) ? acc : Object.values( acc )).includes( value );
  }
  return notDuped;
}, reducer );
const skipWhile = <TInput, TResult>( predicate: ( curr: TInput, acc: TResult,) => boolean, state: boolean = false ) => (reducer: Transducer) => FilterReducer(( value: TInput, acc: TResult,  index:number ) => {
  if ( !state )
    return state = !predicate( value, acc );
  return true;
}, reducer );


// Functions
const transduce = <TInput, TResult>( transformer: (reducer:Transducer) => Transducer , reducer: Transducer, initialValue:CollectionResult<TResult>, collection: CollectionInput<TInput> ): CollectionResult<TResult> => {
  if ( !initialValue ) initialValue = ( init( transformer ))();
  const transformedReducer = transformer( reducer );
  let accumulation: any = initialValue;
  const iter = getIterator( collection );
  let val = iter.next();
  let index = 0;
  while( !val.done ) {
    accumulation = step( transformedReducer )( accumulation, val.value, index );
    if( isReduced( accumulation )) {
      accumulation = value( accumulation );
      break;
    }
    val = iter.next();
    index++;
  }
  return result( transformedReducer )( accumulation );
};

function into<TInput, TResult>(to: CollectionResult<TResult>, transformer:(reducer:Transducer) => Transducer): PartialSeq<TInput, TResult>;
function into<TInput, TResult>(to: CollectionResult<TResult>, transformer:(reducer:Transducer) => Transducer, collection: CollectionInput<TInput>): CollectionResult<TResult>;
function into<TInput, TResult>( to: CollectionResult<TResult>, transformer:(reducer:Transducer) => Transducer, collection?: CollectionInput<TInput> ):
  CollectionResult<TResult> | PartialSeq<TInput,TResult> {
  if ( !collection ) return (collection: CollectionInput<TInput>): CollectionResult<TResult> => (into( to, transformer, collection ) as CollectionResult<TResult>);
  return transduce( transformer, isArray( to ) ? ArrayReducer() : ObjectReducer(), to, collection );
};

function seq<TInput, TResult>( transformer:(reducer:Transducer) => Transducer ) : PartialInto<TInput, TResult>;
function seq<TInput, TResult>( transformer:(reducer:Transducer) => Transducer, collection?: CollectionInput<TInput> ): CollectionResult<TResult>;
function seq<TInput, TResult>( transformer:(reducer:Transducer) => Transducer, collection?: CollectionInput<TInput> ) :
  CollectionResult<TResult> | PartialInto<TInput,TResult> {
  if ( !collection ) return (collection: CollectionInput<TInput>): CollectionResult<TResult> => (seq( transformer, collection ) as CollectionResult<TResult>);
  return into( isArray( collection ) ? [] : {} as {[key:string]: TResult}, transformer, collection );
};

//*******************************************
// Public Interface
//*******************************************

export default {
  // Reducers
  FilterReducer,
  MapReducer,
  ReduceReducer,
  WhileReducer,
  // utils
  StandardReducer,
  defaultReducerProps,
  Reduced,
  isReduced,
  // operations
  map,
  flatMap,
  filter,
  reduce,
  dedupe,
  take,
  skip,
  takeUntil,
  skipWhile,
  // functions
  transduce,
  into,
  seq
};
