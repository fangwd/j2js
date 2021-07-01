import { flatternFile, TypeSource } from './flattern';
import { lexall } from './lexer';

function toTypeInfo(entry: TypeSource | undefined): any {
  if (entry === undefined) return undefined;
  return {
    name: entry.name,
    type: entry.kind,
    level: entry.level
  };
}

test('flatternFile', () => {
  const lines = `
class Class1 {
  int n;
  int g(){}
  /* { method */
  private int f() {
    if (1) {} else {
    }
    else {
    }
  }
  // {
  /** some doc
   */
  private class Class2 {
    String x;
    int g()
    {
      /** random doc */
    }
  }
  /** some doc too */
  int blah;
  interface Blah
  {
  }
  int doo;
  /** some doc 3 */
  enum Enum {
  }
}
`

  const class1Lines = `
class Class1 {
  int n;
  int g(){}
  /* { method */
  private int f() {
    if (1) {} else {
    }
    else {
    }
  }
  // {
  /** some doc too */
  int blah;
  int doo;
}
`

  const class2Lines = `
  /** some doc
   */
  private class Class2 {
    String x;
    int g()
    {
      /** random doc */
    }
  }
`

  const interfaceLines = `
  interface Blah
  {
  }
`

  const enumLines = `
  /** some doc 3 */
  enum Enum {
  }
`
  const entries = flatternFile(lexall(lines ));
  expect(entries.length).toBe(4);
  expect(entries[0].tokens).toEqual(lexall(class1Lines ));
  expect(entries[1].tokens).toEqual(lexall(class2Lines));
  expect(entries[2].tokens).toEqual(lexall(interfaceLines));
  expect(entries[3].tokens).toEqual(lexall(enumLines));
  expect(entries.map((entry) => toTypeInfo(entry))).toEqual([
    { name: 'Class1', type: 'class', level: 0 },
    { name: 'Class2', type: 'class', level: 1 },
    { name: 'Blah', type: 'interface', level: 1 },
    { name: 'Enum', type: 'enum', level: 1 }
  ]);
});
