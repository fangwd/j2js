import { ClassParser, FIRST_FLAG, LAST_FLAG, STATIC_FLAG } from './parser';
import { lexall } from './lexer';
import * as fs from 'fs';

test('class entry', async () => {
  const source = `public interface Class1 {}`;
  const tokens = await lexall(source);
  const parser = new ClassParser(tokens);
  const entry = parser.parse();
  expect(entry.kind).toBe('interface');
  expect(entry.name).toBe('Class1');
  expect(entry.js().join(' ')).toBe('export interface Class1 { }');
});

describe('property', () => {
  test('simple', async () => {
    const source = `public class Class1 {
      int n;
    }`;
    const tokens = await lexall(source);
    const parser = new ClassParser(tokens);
    const entry = parser.parse();
    expect(entry.members).toEqual([
      {
        kind: 'property',
        type: 'int',
        name: 'n',
        flags: FIRST_FLAG | LAST_FLAG,
        array: 0,
      }
    ]);
    expect(entry.js().join(' ')).toBe('class Class1 { n : int ; }');
  });

  test('array', async () => {
    const source = `public class Class1 {
      private final int[] n;
      static public string s[][];
    }`;
    const tokens = await lexall(source);
    const parser = new ClassParser(tokens);
    const entry = parser.parse();
    expect(entry.members).toEqual([
      {
        kind: 'property',
        type: 'int',
        name: 'n',
        flags: FIRST_FLAG | LAST_FLAG,
        array: 1
      },
      {
        kind: 'property',
        type: 'string',
        name: 's',
        flags: STATIC_FLAG | FIRST_FLAG | LAST_FLAG,
        array: 2
      }
    ]);
    expect(entry.js().join(' ')).toBe(
      'class Class1 { n : int[] ; static s : string[][] ; }'
    );
  });

  test('initialiser', async () => {
    const source = `public class T1 {
      private final int m = 2;
      public int n = m + 1, x[] = m + 2;
    }`;
    const tokens = await lexall(source);
    const parser = new ClassParser(tokens);
    const entry = parser.parse();
    expect(entry.members).toEqual([
      {
        kind: 'property',
        type: 'int',
        name: 'm',
        flags: FIRST_FLAG | LAST_FLAG,
        value: ['2'],
        array: 0,
      },
      {
        kind: 'property',
        type: 'int',
        name: 'n',
        flags: FIRST_FLAG,
        value: ['m$', '+', '1'],
        array: 0,
      },
      {
        kind: 'property',
        type: 'int',
        name: 'x',
        flags: LAST_FLAG,
        value: ['m$', '+', '2'],
        array: 1
      }
    ]);
    expect(entry.js().join(' ')).toBe(
      'class T1 { m : int = 2 ; n : int = this.m + 1 , x : int[] = this.m + 2 ; }'
    );
  });
});

test('method', async () => {
  const source = `public class T1 {
      int foo(){}
      static int[] bar(int[] m,float n){}
  }`;
  const tokens = await lexall(source);
  const parser = new ClassParser(tokens);
  const entry = parser.parse();
  expect(entry.members).toEqual([
    {
      kind: 'method',
      type: 'int',
      name: 'foo',
      flags: 0,
      args: [],
      body: ['{', '}'],
      array: 0,
    },
    {
      kind: 'method',
      type: 'int',
      name: 'bar',
      flags: STATIC_FLAG,
      array: 1,
      args: [
        { type: 'int', name: 'm', flags: 0, array: 1 },
        { type: 'float', name: 'n', flags: 0, array: 0 },
      ],
      body: ['{', '}'],
    },
  ]);
  expect(entry.js().join(' ')).toBe(
    'class T1 { foo ( ) : int { } static bar ( m : int[] , n : float ) : int[] { } }'
  );
});

describe('expr', () => {
  test('scope', async () => {
    const source = `public class T {
      int x;
      int f(){int y; int z=y+x;}
  }`;
    const tokens = await lexall(source);
    const parser = new ClassParser(tokens);
    const entry = parser.parse();
    expect(entry.js().join(' ')).toBe(
      'class T { x : int ; f ( ) : int { var y : int ; var z : int = y + this.x ; } }'
    );
  });
  test('scope #2', async () => {
    const source = `public class T {
      Lexer l;
      int f(){ l.lex();}
  }`;
    const tokens = await lexall(source);
    const parser = new ClassParser(tokens);
    const entry = parser.parse();
    expect(entry.js().join(' ')).toBe(
      'class T { l : Lexer ; f ( ) : int { this.l.lex ( ) ; } }'
    );
  });

  test('new #1', async () => {
    const source = `public class T {
      int x;
      int f(){int y = new X(x,1);}
  }`;
    const tokens = await lexall(source);
    const parser = new ClassParser(tokens);
    const entry = parser.parse();
    expect(entry.js().join(' ')).toBe(
      'class T { x : int ; f ( ) : int { var y : int = new X ( this.x , 1 ) ; } }'
    );
  });
  test('new #2.1', async () => {
    const source = `public class T {
      int x;
      int f(){int y = new byte[] {};}
    }`;
    const tokens = await lexall(source);
    const parser = new ClassParser(tokens);
    const entry = parser.parse();
    expect(entry.js().join(' ')).toBe(
      'class T { x : int ; f ( ) : int { var y : int = [ ] ; } }'
    );
  });
  test('new #2.2', async () => {
    const source = `public class T {
      int x;
      int f(){int z;int y = new byte[] {x+z,1};}
    }`;
    const tokens = await lexall(source);
    const parser = new ClassParser(tokens);
    const entry = parser.parse();
    expect(entry.js().join(' ')).toBe(
      'class T { x : int ; f ( ) : int { var z : int ; var y : int = [ this.x + z , 1 ] ; } }'
    );
  });
  test('new #3', async () => {
    const source = `public class T {
      int f(){int y = new Object[5];}
    }`;
    const tokens = await lexall(source);
    const parser = new ClassParser(tokens);
    const entry = parser.parse();
    expect(entry.js().join(' ')).toBe(
      'class T { f ( ) : int { var y : int = new_any ( 5 ) ; } }'
    );
  });
  test('for #1', async () => {
    const source = `public class T {
      double i,d;
      int f(){int j;for(int i=0;i<1;i++){j+=i+d;}}
    }`;
    const tokens = await lexall(source);
    const parser = new ClassParser(tokens);
    const entry = parser.parse();
    expect(entry.js().join(' ')).toBe(
      'class T { i : double , d : double ; f ( ) : int { var j : int ; ' +
        'for ( let i : int = 0 ; i < 1 ; i ++ ) { j += i + this.d ; } } }'
    );
  });
  test('for #2', async () => {
    const source = `public class T {
      int f(){for(int i=0;i<1;i++); int n; n++; }
    }`;
    const tokens = await lexall(source);
    const parser = new ClassParser(tokens);
    const entry = parser.parse();
    expect(entry.js().join(' ')).toBe(
      'class T { f ( ) : int { for ( let i : int = 0 ; i < 1 ; i ++ ) ; var n : int ; n ++ ; } }'
    );
  });
  test('for #3', async () => {
    const source = `public class T { int f(){for(int n:array) g(n); } }`;
    const tokens = await lexall(source);
    const parser = new ClassParser(tokens);
    const entry = parser.parse();
    expect(entry.js().join(' ')).toBe(
      'class T { f ( ) : int { for ( let n of array ) g ( n ) ; } }'
    );
  });
  test('for #4', async () => {
    const source = `public class T { int f(){for(;;) g(n); } }`;
    const tokens = await lexall(source);
    const parser = new ClassParser(tokens);
    const entry = parser.parse();
    expect(entry.js().join(' ')).toBe(
      'class T { f ( ) : int { for ( ; ; ) g ( n ) ; } }'
    );
  });

  test('if', async () => {
    const source = `public class T {
      int a;int b;
      int f(int x){a++;if (a==b) {int[] bar = new int[3];}}
    }`;
    const tokens = await lexall(source);
    const parser = new ClassParser(tokens);
    const entry = parser.parse();
    expect(entry.js().join(' ')).toBe(
      'class T { a : int ; b : int ; f ( x : int ) : int { this.a ++ ; ' +
        'if ( this.a == this.b ) { var bar : int[] = new_any ( 3 ) ; } } }'
    );
  });
});

test('switch', async () => {
  const source = `class T { void f() { switch(x) { case 2: { print(); }; break; } } }`;
  const tokens = await lexall(source);
  const parser = new ClassParser(tokens);
  const entry = parser.parse();
  expect(entry.js().join(' ')).toBe(
    'class T { f ( ) : void { switch ( x ) { case 2 : { print ( ) ; } ; break ; } } }'
  );
});

test('while', async () => {
  const source = `class T { void f() { while(1); while(1){{}} do {} while(1); } }`;
  const tokens = await lexall(source);
  const parser = new ClassParser(tokens);
  const entry = parser.parse();
  expect(entry.js().join(' ')).toBe(
    'class T { f ( ) : void { while ( 1 ) ; while ( 1 ) { { } } do { } while ( 1 ) ; } }'
  );
});

test('constructor', async () => {
  const source = `class Foo { public Foo(int x) {}}`;
  const tokens = await lexall(source);
  const parser = new ClassParser(tokens);
  const entry = parser.parse();
  expect(entry.js().join(' ')).toBe(
    'class Foo { constructor ( x : int ) { } }'
  );
});

test('type cast', async () => {
  const source = `class T { int n = (int) b; }`;
  const tokens = await lexall(source);
  const parser = new ClassParser(tokens);
  const entry = parser.parse();
  expect(entry.js().join(' ')).toBe('class T { n : int = b ; }');
});

test('js', async () => {
  const source = `class T {
    static int n = getn();
    static int getn() { return 1; }
    int m;
    void f() { m = getn()+n; }
  }`;
  const tokens = await lexall(source);
  const parser = new ClassParser(tokens);
  const entry = parser.parse();
  expect(entry.js(new Map()).join(' ')).toBe(
    'const n : int = getn ( ) ; function getn ( ) : int { return 1 ; } ' +
      'class T { m : int ; ' +
      'f ( ) : void { this.m = getn ( ) + n ; } }'
  );
});

test('overloading', async () => {
  const source = `class T {
    int f(double d) {}
    int f(int n) {}
    int f(int n,double d) {}
    int f(){}
    double d;
    int g() { int a; double b; f(a); f(a,b); f(d); f(); f(a,a); f(new int()); }
  }`;
  const tokens = await lexall(source);
  const parser = new ClassParser(tokens);
  const entry = parser.parse();
  expect(entry.js().join(' ')).toBe(
    'class T { ' +
      'f ( d : double ) : int { } ' +
      'f_1 ( n : int ) : int { } ' +
      'f_2 ( n : int , d : double ) : int { } ' +
      'f_3 ( ) : int { } ' +
      'd : double ; ' +
      'g ( ) : int { ' +
      'var a : int ; ' +
      'var b : double ; ' +
      'this.f_1 ( a ) ; ' +
      'this.f_2 ( a , b ) ; ' +
      'this.f ( this.d ) ; ' +
      'this.f_3 ( ) ; ' +
      'f ( a , a ) ; ' +
      'this.f_1 ( new int ( ) ) ; ' +
      '} ' +
      '}'
  );
});

test('overloading #2', async () => {
  const source = `class T {
    int f(double d) { int n; f(n); }
    int f(int n) {}
  }`;
  const tokens = await lexall(source);
  const parser = new ClassParser(tokens);
  const entry = parser.parse();
  expect(entry.js().join(' ')).toBe(
    'class T { ' +
      'f ( d : double ) : int { var n : int ; this.f_1 ( n ) ; } ' +
      'f_1 ( n : int ) : int { } ' +
      '}'
  );
});

test('misc #1', async () => {
  const source = `class T {
    T(double d) { _d = d ; }
    double _d;
  }`;
  const tokens = await lexall(source);
  const parser = new ClassParser(tokens);
  const entry = parser.parse();
  expect(entry.js().join(' ')).toBe(
    'class T { ' +
      'constructor ( d : double ) { this._d = d ; } ' +
      '_d : double ; ' +
      '}'
  );
});

test('misc #2', async () => {
  const source = `class P {
    P() {}
    P(int n){}
    P(int n, float x){}
    P(Object o, string s){}
    int f(){}
  }`;
  const tokens = await lexall(source);
  const parser = new ClassParser(tokens);
  const entry = parser.parse();
  expect(entry.js().join(' ')).toBe(
    `class P {
      constructor ( ...args : any[] ) { 
       if (args.length === 0) { this.constructor_0(); } 
       else if (args.length === 1 && typeof args[0] === 'number') {
         this.constructor_1(args[0] as int);
       } 
       else if (args.length === 2 && typeof args[0] === 'number' && typeof args[1] === 'number') {
          this.constructor_2(args[0] as int, args[1] as float);
       } 
       else if (args.length === 2 && (args[0] instanceof Object||args[0]===null) && typeof args[1] === 'string') {
          this.constructor_3(args[0] as Object, args[1] as string);
       }
       else throw Error('Unknown type(s)');
      }
      constructor_0 ( )  { }
      constructor_1 ( n : int ) { }
      constructor_2 ( n : int , x : float ) { }
      constructor_3 ( o : Object , s : string ) { }
      f ( ) : int { }
    }`.replace(/\s+/g, ' ')
  );
});

test('interface', async () => {
  const source = `interface T {
    static final int YYEOF = 0;
    static final int YYerror = 256;
    static final int YYUNDEF = 257;
    static final int BANG = 258;
    void yyerror(Location loc, String msg);
    void reportSyntaxError (Context ctx);
  }`;
  const tokens = await lexall(source);
  const parser = new ClassParser(tokens);
  const entry = parser.parse();
  expect(entry.js(new Map()).join(' ')).toBe(
    `export const YYEOF : int = 0 ;
     export const YYerror : int = 256 ;
     export const YYUNDEF : int = 257 ;
     export const BANG : int = 258 ;
     export interface T {
       yyerror ( loc : Location , msg : String ) : void ;
       reportSyntaxError ( ctx : Context ) : void ;
     }
   `
      .trim()
      .replace(/\s+/g, ' ')
  );
});

test('annotation', async () => {
  {
    const source = '@Internal interface T1 {}';
    const parser = new ClassParser(lexall(source));
    const type = parser.parse();
    expect(type.name).toBe('T1');
  }
  {
    const source = '@Internal((a),((b + (1))))interface T2 {}';
    const parser = new ClassParser(lexall(source));
    const type = parser.parse();
    expect(type.name).toBe('T2');
  }
  {
    const source = 'class T {@Override int x(){}}';
    const parser = new ClassParser(lexall(source));
    const type = parser.parse();
    expect(type.name).toBe('T');
  }
});

test('try', () => {
  const source = `class T { int f() { try { } catch (Exception e) { ; } } } `;
  const parser = new ClassParser(lexall(source));
  const type = parser.parse();
  expect(type.name).toBe('T');
  const code = type.js().join(' ');
  expect(code.indexOf('try { } catch ( e ) { ; }')).not.toBe(-1);
});

test('generics', () => {
  const source = `class T { int f() { Object x = new ArrayList<T>(2); } }`;
  const parser = new ClassParser(lexall(source));
  const type = parser.parse();
  expect(type.name).toBe('T');
});

test('random', () => {
  const source = `class T { int f(X[][]x) { } }`;
  const parser = new ClassParser(lexall(source));
  const type = parser.parse();
  expect(type.name).toBe('T');
  const code = type.js().join(' ');
  expect(code.indexOf('x : X[][]')).not.toBe(-1);
});

test('random #2', () => {
  const source = `class T { int f() {
    case 5: if (yyn==39) {
       { yyval = ((Node)(yystack.valueAt (2))); }
       } } }`;
  const parser = new ClassParser(lexall(source));
  const type = parser.parse();
  expect(type.name).toBe('T');
});
