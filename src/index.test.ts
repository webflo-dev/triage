import t from '.';
import sinon from 'sinon';
const {
  seq,
  into,
  map,
  flatMap,
  filter,
  reduce,
  Reduced,
  dedupe,
  take,
  skip,
  takeUntil,
  skipWhile
} = t;
import { compose } from 'rambda';
import { assert } from 'chai';

describe( 'transducers', function() {
  describe( 'creation of on the spot transducer', function() {
    it( 'makes use of an on-the-spot creation', () => {
      const nth = ( iteration, init = 0 ) => reducer => ({
        result: reducer.result,
        step: ( acc, curr ) => init++ < iteration ? reducer.step( acc, curr ) : Reduced( acc )
      });
      const arr = [...Array( 10 ).keys()];
      const result = into([] as number[],
        compose(
          filter( (num: number) => num % 2 === 0 ),
          map( (num: number) => num * 10 ),
          map( (num: number) => num / 2 ),
          nth( 2 )
        ),
        arr
      );
      assert.deepEqual( result, [ 0, 10 ]);
    });
  });
  describe( 'Current and Accumulate for everyone', function() {
    it( 'Receives current and accumulate on filter', () => {
      const obj = { a:1, b:2, c:3, d:4, e:1, f:3 };
      const result = seq(
        filter(([ , value ], accumulate ) => {
          assert.isObject( accumulate );
          return !Object.values( accumulate ).includes( value );
        })
        , obj );
      assert.deepEqual( result, { a:1, b:2, c:3, d:4 });
    });
  });
  describe( 'Arrays', function() {
    describe( 'flatMap', function() {
      it( 'flats and map an array', () => {
        const arr = [ 1,2, [ 3,4,5 ], 6,7,8,9 ];
        const res = seq<number, number>( flatMap( (x:number) => x * 2 ));
        assert.isFunction( res );
        const result = res( arr );
        assert.deepEqual( result, [ 2, 4, 6, 8, 10, 12, 14, 16, 18 ]);
      });
      it( 'works with whileReducer after flatMap', () => {
        const arr = [ 1,2, [ 3,4,5 ], 6,7,8,9 ];
        const res = seq<number, number>( compose(
          flatMap( (x : number) => x * 2 ),
          takeUntil( x => x !== 8 )
        ));
        assert.isFunction( res );
        const result = res( arr );
        assert.deepEqual( result, [ 2, 4, 6 ]);
      });
      it( 'works with whileReducer before flatMap', () => {
        const arr = [ 1,2, [ 3,4,5 ], 6,7,8,9 ];
        const res = seq( compose(
          takeUntil( x => x !== 6 ),
          flatMap( (x: number) => x * 2 ),
        ));
        assert.isFunction( res );
        const result = res( arr );
        assert.deepEqual( result, [ 2, 4, 6, 8, 10 ]);
      });
    });
    describe( 'seq', function() {
      it( 'accepts curring', () => {
        const arr = [...Array( 10 ).keys()];
        const res = seq(
          compose(
            filter( (num: number) => num % 2 === 0 ),
            map( (num: number) => num * 10 ),
            map( (num: number) => num / 2 ),
          ));
        assert.isFunction( res );
        const result = res( arr );
        assert.deepEqual( result, [ 0, 10, 20, 30, 40 ]);
      });
      it( 'reduces the operations with functional params order', () => {
        const arr = [...Array( 10 ).keys()];
        const result = seq(
          compose(
            filter( (num: number) => num % 2 === 0 ),
            map( (num: number) => num * 10 ),
            map( (num: number) => num / 2 ),
          ),
          arr
        ); //?.$
        assert.deepEqual( result, [ 0, 10, 20, 30, 40 ]);
      });
    });
    describe( 'reduce', function() {
      it( 'works with a seq, compose', () => {
        const arr = [...Array( 10 ).keys()];
        const result = seq(
          compose(
            filter( (num: number) => num % 2 === 0 ),
            map( (num: number) => num * 10 ),
            map( (num: number) => num / 2 ),
            reduce(( accumulate: number, current:number ) => accumulate + current, 0 ),
          ),
          arr
        ); //?.$
        assert.equal( result, 100 );
      });
      it( 'works with strings for seq, compose', () => {
        const parts = 'hola mi pana'.split(/[_\s\-]/);
        const result = seq(
          compose(
            filter( (part: string) => !!part ),
            map((part:string, index:number) => {
              return index === 0 ? part : part[0].toUpperCase() + part.slice(1);
            }),
            reduce(( accumulate: string, current:string ) => accumulate + current, '' ),
          ),
          parts
        ); //?.$
        assert.equal( result, 'holaMiPana' );
      });
    });
    describe( 'into', function() {
      it( 'accepts curring', () => {
        const arr = [...Array( 10 ).keys()];
        const res = into([], compose(
          filter( (num: number) => num % 2 === 0 ),
          map( (num: number) => num * 10 ),
          map( (num: number) => num / 2 ),
        ));
        assert.isFunction( res );
        const result = res( arr );
        assert.deepEqual( result, [ 0, 10, 20, 30, 40 ]);
      });
      it( 'reduces the operations with functional params order', () => {
        const arr = [...Array( 10 ).keys()];
        const result = into([],
          compose(
            filter( (num: number) => num % 2 === 0 ),
            map( (num: number) => num * 10 ),
            map( (num: number) => num / 2 ),
          ),
          arr
        );
        assert.deepEqual( result, [ 0, 10, 20, 30, 40 ]);
      });
    });
    describe( 'dedupe', function() {
      it( 'Does nothing if values are not duped', () => {
        const arr = [...Array( 10 ).keys()];
        const result = seq(
          compose(
            dedupe()
          ), arr );
        assert.deepEqual( result, arr );
      });
      it( 'dedupes consecutive values from a stream of data', () => {
        const arr = [ 0,0,1,2,2,3,4,2,3,1,2,2,0 ];
        const result = seq(
          compose(
            dedupe()
          ), arr );
        assert.deepEqual( result, [ 0, 1, 2, 3, 4, 2, 3, 1, 2, 0 ]);
      });
      it( 'dedupes values from all data streamed so far', () => {
        const arr = [ 0,0,1,2,2,3,4,2,3,1,2,2,0 ];
        const result = seq(
          compose(
            dedupe( true )
          ), arr );
        assert.deepEqual( result, [ 0, 1, 2, 3, 4 ]);
      });
    });
    describe( 'take', function() {
      it( 'takes from a stream of data starting on one element for a count of elements', () => {
        const arr = [...Array( 10 ).keys()];
        assert.deepEqual( seq( compose( take()), arr ), [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 ]);
        assert.deepEqual( seq( compose( take( 2 )), arr ), [ 0, 1 ]);
      });
    });
    describe( 'skip', function() {
      it( 'takes from a stream of data starting on one element for a count of elements', () => {
        const arr = [...Array( 10 ).keys()];
        assert.deepEqual( seq( compose( skip()), arr ), [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 ]);
        assert.deepEqual( seq( compose( skip( 2 )), arr ), [ 2, 3, 4, 5, 6, 7, 8, 9 ]);
      });
    });
    describe( 'takeUntil', function() {
      it( 'takes from a stream of data while condition is true', () => {
        const spy1 = sinon.spy();
        const spy2 = sinon.spy();
        const arr = [...Array( 100 ).keys()];
        const fn = seq( compose(
          map( x=> { spy1(); return x ; }),
          takeUntil( v => v !== 4 ),
          map( x=> { spy2(); return x ; })
        ));
        const res = fn( arr );
        assert.deepEqual( res, [ 0, 1, 2, 3 ]);
        assert.equal( spy1.callCount, 5 );
        assert.equal( spy2.callCount, 4 );
        spy1.resetHistory();
        spy2.resetHistory();
        const res2 = fn([ 0,3,4,3,2,3,4,4 ]);
        assert.deepEqual( res2, [ 0, 3 ]);
        assert.equal( spy1.callCount, 3 );
        assert.equal( spy2.callCount, 2 );
      });
    });
    describe( 'skipWhile', function() {
      it( 'takes from a stream of data starting on one element for a count of elements', () => {
        const arr = [...Array( 10 ).keys()];
        assert.deepEqual( seq( compose( skipWhile( v => v !== 4 )), arr ), [ 4, 5, 6, 7, 8, 9 ]);
      });
    });
  });
  describe( 'Objects', function() {
    describe( 'seq', function() {
      it( 'accepts curring', () => {
        const obj = [...Array( 10 ).keys()].reduce(( acc, curr ) => { acc[curr] = curr; return acc ; }, {});
        const res = seq(
          compose(
            filter(([ , value ]) => value % 2 === 0 ),
            map(([ key, value ]) => [ key, value * 10 ]),
            map(([ key, value ]) => [ key, value / 2 ]),
          ));
        assert.isFunction( res );
        const result = res( obj );
        assert.deepEqual( result, { 0: 0, 2: 10, 4: 20, 6: 30, 8: 40 });
      });
      it( 'reduces the operations with functional params order', () => {
        const obj = [...Array( 10 ).keys()].reduce(( acc, curr ) => { acc[curr] = curr; return acc ; }, {});
        const result = seq(
          compose(
            filter(([ , value ]) => value % 2 === 0 ),
            map(([ key, value ]) => [ key, value * 10 ]),
            map(([ key, value ]) => [ key, value / 2 ]),
          ),
          obj
        ); //?.$
        assert.deepEqual( result, { 0: 0, 2: 10, 4: 20, 6: 30, 8: 40 });
      });
    });
    describe( 'reduce', function() {
      it( 'works with a seq, compose', () => {
        const obj = [...Array( 10 ).keys()].reduce(( acc, curr ) => { acc[curr] = curr; return acc ; }, {});
        const result = seq(
          compose(
            filter(([ , value ]) => value % 2 === 0 ),
            map(([ key, value ]) => [ key, value * 10 ]),
            map(([ key, value ]) => [ key, value / 2 ]),
            reduce(( accumulate, [ , value ]) => accumulate + value, 0 ),
          ),
          obj
        ); //?.$
        assert.equal( result, 100 );
      });
    });
    describe( 'into', function() {
      it( 'Adds the processed elements into another object', () => {
        const obj = { a:1, b:2, c:3, d:4 };
        const result = into({},
          compose(
            filter(([ , value ]) => value % 2 === 0 ),
            map(([ key, value ]) => [ key, value * 10 ]),
            map(([ key, value ]) => [ key, value / 2 ]),
          ),
          obj
        );
        assert.deepEqual( result, { b: 10, d: 20 });
      });
    });
  });
});
