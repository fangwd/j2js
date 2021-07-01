import { Method, ClassEntry, STATIC_FLAG, ASSERT_FLAG } from './parser';

const typeofs: { [key: string]: string } = {
  String: 'string',
  string: 'string',
  byte: 'number',
  int: 'number',
  long: 'number',
  float: 'number',
  double: 'number'
};

export function fixCtors(entry: ClassEntry) {
  const ctors: Method[] = entry.members.filter(
    (member) => member.kind === 'method' && member.name === 'constructor'
  ) as Method[];

  if (ctors.length <= 1) {
    return;
  }

  ctors.find((entry) => entry.name === 'constructor')!._name = 'constructor_0';
  const stmt =
    ctors.map((ctor) => getIfStmt(ctor)).join(' else ') +
    ` else throw Error('Unknown type(s)');`;
  entry.members.unshift({
    kind: 'method',
    name: 'constructor',
    args: [
      {
        name: '...args',
        type: 'any[]',
        flags: 0,
        array: 0
      }
    ],
    body: ['{', stmt, '}'],
    type: '',
    flags: 0,
    array: 0
  });

  for (const member of entry.members) {
    if (member.kind === 'property' && (member.flags & STATIC_FLAG) === 0) {
      member.flags |= ASSERT_FLAG;
    }
  }
}

function getIfStmt(method: Method) {
  const name = method._name || method.name;

  if (method.args.length === 0) {
    return `if (args.length === 0) { this.${name}(); }`;
  }

  const cond: string[] = [`args.length === ${method.args.length}`];
  const expr: string[] = [];

  for (let i = 0; i < method.args.length; i++) {
    const name = `args[${i}]`;
    const type = method.args[i].type;
    if (/^[A-Z]/.test(type)) {
      cond.push(`(${getTypeOf(name, type)}||${name}===null)`);
    } else {
      cond.push(`${getTypeOf(name, type)}`);
    }
    expr.push(`${name} as ${type}`);
  }

  return `if (${cond.join(' && ')}) { this.${name}(${expr.join(', ')}); }`;
}

function getTypeOf(name: string, type: string) {
  if (typeofs[type] !== undefined) {
    return `typeof ${name} === '${typeofs[type]}'`;
  }
  return `${name} instanceof ${type}`;
}
