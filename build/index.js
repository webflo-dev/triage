"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const isArray = Array.isArray;
const isObject = (theObject) => theObject instanceof Object && Object.getPrototypeOf(theObject) === Object.getPrototypeOf({});
const ensureArray = (theArray) => isArray(theArray) ? theArray : (theArray != null ? [theArray] : []);
//*******************************************
// utils
//*******************************************
const init = obj => obj['@@transducer/init'] || obj.init;
const step = (obj) => obj['@@transducer/step'] || obj.step;
const value = obj => obj['@@transducer/value'] || obj.value;
const result = (obj) => obj['@@transducer/result'] || obj.result;
const StandardReducer = (description) => ({
    'init': description.init || description['@@transducer/init'],
    'step': description.step || description['@@transducer/step'],
    'value': description.value || description['@@transducer/value'],
    'result': description.result || description['@@transducer/result'],
    '@@transducer/init': description['@@transducer/init'] || description.init,
    '@@transducer/step': description['@@transducer/step'] || description.step,
    '@@transducer/value': description['@@transducer/value'] || description.value,
    '@@transducer/result': description['@@transducer/result'] || description.result,
});
const Reduced = (value) => ({
    '@@transducer/reduced': true,
    '@@transducer/value': value
});
const isReduced = (result) => result && result['@@transducer/reduced'];
const ObjectIterator = obj => {
    const keys = Object.keys(obj);
    let index = 0;
    return {
        next: () => {
            if (index < keys.length) {
                const res = {
                    value: [keys[index], obj[keys[index]]],
                    done: false
                };
                index++;
                return res;
            }
            else
                return { done: true };
        }
    };
};
const getIterator = (collection) => {
    if (collection[Symbol.iterator])
        return collection[Symbol.iterator]();
    if (isObject(collection))
        return ObjectIterator(collection);
    throw new Error(`Transducers: No Iterator for collection: ${collection}`);
};
const defaultReducerProps = reducer => ({
    '@@transducer/init': (...args) => init(reducer)(...args),
    '@@transducer/result': (arg) => result(reducer)(arg)
});
//*******************************************
// Reducers
//*******************************************
const ArrayReducer = () => StandardReducer({
    '@@transducer/init': (initialValue) => initialValue,
    '@@transducer/result': (result) => result,
    '@@transducer/step': (array, value) => { array.push(value); return array; },
});
const ObjectReducer = () => StandardReducer({
    '@@transducer/init': (initialObject) => initialObject || {},
    '@@transducer/result': (result) => result,
    '@@transducer/step': (object, value) => {
        if (isArray(value) && value.length === 2) {
            object[value[0]] = value[1];
        }
        else {
            Object.keys(value).forEach(k => {
                object[k] = value[k];
            });
        }
        return object;
    }
});
//*******************************************
// Transformer types
//*******************************************
const MapReducer = (fn, reducer) => StandardReducer({
    ...defaultReducerProps(reducer),
    '@@transducer/step': (acc, curr, index) => step(reducer)(acc, fn(curr, index, acc)),
});
const FlatMapReducer = (fn, reducer) => StandardReducer({
    ...defaultReducerProps(reducer),
    '@@transducer/step': (acc, curr) => {
        for (const c of ensureArray(curr)) {
            const reduced = step(reducer)(acc, fn(c));
            if (isReduced(reduced))
                return reduced;
        }
        return acc;
    },
});
const FilterReducer = (predicate, reducer) => StandardReducer({
    ...defaultReducerProps(reducer),
    '@@transducer/step': (acc, curr, index) => predicate(curr, acc, index) ? step(reducer)(acc, curr, index) : acc,
});
const WhileReducer = (predicate, reducer) => StandardReducer({
    ...defaultReducerProps(reducer),
    '@@transducer/step': (acc, curr, index) => predicate(curr, acc, index) ? step(reducer)(acc, curr, index) : Reduced(acc)
});
const ReduceReducer = (fn, initial, reducer) => StandardReducer({
    ...defaultReducerProps(reducer),
    '@@transducer/result': () => initial,
    '@@transducer/step': (acc, curr, index) => {
        initial = fn(initial, curr);
        return step(reducer)(acc, curr, index);
    },
});
//*******************************************
// operations
//*******************************************
const map = (fn) => (reducer) => MapReducer(fn, reducer);
const flatMap = (fn) => (reducer) => FlatMapReducer(fn, reducer);
const reduce = (fn, initial) => (reducer) => ReduceReducer(fn, initial, reducer);
const filter = (predicate) => (reducer) => FilterReducer(predicate, reducer);
const take = (count = Infinity) => (reducer) => WhileReducer(() => count-- > 0, reducer);
const skip = (count = 0) => (reducer) => FilterReducer(() => count-- <= 0, reducer);
const takeUntil = (predicate) => (reducer) => WhileReducer((value, index, acc) => predicate(value, acc), reducer);
const dedupe = (allValues, lastValue) => (reducer) => FilterReducer((value, acc) => {
    let notDuped;
    if (!allValues) {
        notDuped = value !== lastValue;
        lastValue = value;
    }
    else {
        notDuped = !(Array.isArray(acc) ? acc : Object.values(acc)).includes(value);
    }
    return notDuped;
}, reducer);
const skipWhile = (predicate, state = false) => (reducer) => FilterReducer((value, acc, index) => {
    if (!state)
        return state = !predicate(value, acc);
    return true;
}, reducer);
// Functions
const transduce = (transformer, reducer, initialValue, collection) => {
    if (!initialValue)
        initialValue = (init(transformer))();
    const transformedReducer = transformer(reducer);
    let accumulation = initialValue;
    const iter = getIterator(collection);
    let val = iter.next();
    let index = 0;
    while (!val.done) {
        accumulation = step(transformedReducer)(accumulation, val.value, index);
        if (isReduced(accumulation)) {
            accumulation = value(accumulation);
            break;
        }
        val = iter.next();
        index++;
    }
    return result(transformedReducer)(accumulation);
};
function into(to, transformer, collection) {
    if (!collection)
        return (collection) => into(to, transformer, collection);
    return transduce(transformer, isArray(to) ? ArrayReducer() : ObjectReducer(), to, collection);
}
;
function seq(transformer, collection) {
    if (!collection)
        return (collection) => seq(transformer, collection);
    return into(isArray(collection) ? [] : {}, transformer, collection);
}
;
//*******************************************
// Public Interface
//*******************************************
exports.default = {
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
//# sourceMappingURL=index.js.map