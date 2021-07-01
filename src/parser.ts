import { Token } from './lexer';
import { isId } from './language';
import { fixCtors } from './misc';

export const STATIC_FLAG = 0x01;
export const FIRST_FLAG = 0x02;
export const LAST_FLAG = 0x04;
export const ENUM_FLAG = 0x10;
export const ASSERT_FLAG = 0x20;

interface Decl {
  type: string; // int, double
  name: string;
  flags: number; // static, first, last
  array: number; // dimension when type is array
}

interface VarDecl extends Decl {
  value?: Token[];
}

interface Property extends VarDecl {
  kind: 'property';
}

export interface Method extends Decl {
  kind: 'method';
  args: Decl[];
  _name?: string;
  body: Token[];
}

type Member = Property | Method;

type ClassEntryKind = 'class' | 'enum' | 'interface';

type Scope = Map<string, Decl>;

export class ClassEntry {
  name: string;
  kind: ClassEntryKind;
  members: Member[];
  propertyMap: Scope;
  methodMap: Map<string, Method>;

  constructor(name: string, kind: ClassEntryKind) {
    this.name = name;
    this.kind = kind;
    this.members = [];
    this.propertyMap = new Map();
    this.methodMap = new Map();
  }

  addProperty(property: Property) {
    const existing = this.members.find(
      (member) => member.name === property.name
    );
    if (existing) {
      if (existing.kind === 'method') {
        existing._name = (existing._name || existing.name) + '_set';
      }
    }
    this.members.push(property);
    this.propertyMap.set(property.name, property);
  }

  addMethod(method: Method) {
    let n = 0;
    for (const member of this.members) {
      if (member.name === method.name) {
        if (member.kind === 'method') {
          n++;
        } else {
          method._name = method.name + '_set';
        }
      }
    }
    if (n > 0) {
      method._name = method.name + '_' + n;
    }
    this.members.push(method);
    const key =
      method.name + '@' + method.args.map((arg) => arg.type).join(':');
    this.methodMap.set(key, method);
  }

  getProperty(name: string) {
    for (const member of this.members) {
      if (member.name === name && member.kind === 'property') {
        if (member.name === name) {
          return member;
        }
      }
    }
    return undefined;
  }

  js(types?: Map<string, ClassEntry>, toExport?: Set<string>) {
    const file: Token[] = [];
    const toGlobal = !!types && this.kind !== 'enum';
    const globals: Map<string, Member> = new Map();
    fixCtors(this);
    if (toGlobal) {
      for (const member of this.members) {
        if ((member.flags & STATIC_FLAG) === 0) {
          continue;
        }
        const flags = member.flags & ~STATIC_FLAG & ~ENUM_FLAG;
        if (member.kind === 'property') {
          if (
            (toExport && toExport.has(member.name)) ||
            this.kind === 'interface'
          ) {
            file.push('export');
          }
          file.push('const');
          writeVarDecl(file, { ...member, flags });
        } else {
          file.push('function');
          writeMethodDecl(file, { ...member, flags });
          file.push(...member.body);
        }
        globals.set(member.name, member);
      }
      for (let i = 0; i < file.length; i++) {
        const token = file[i];
        if (typeof token === 'string') {
          let at = token.indexOf('@');
          if (at !== -1) {
            file[i] = token.substring(0, at);
            continue;
          }
          const dot = token.indexOf('.');
          if (dot !== -1) {
            const key = token.substring(0, dot);
            if (types && types.has(key)) {
              file[i] = token.substring(dot + 1);
              continue;
            }
          }
        }
      }
    }
    const output: Token[] = [
      this.kind === 'enum' ? 'class' : this.kind,
      this.name,
      '{'
    ];
    if ((toExport && toExport.has(this.name)) || this.kind === 'interface') {
      output.unshift('export');
    }
    for (const member of this.members) {
      if ((member.flags & STATIC_FLAG) !== 0 && toGlobal) {
        continue;
      }
      if (member.kind === 'property') {
        writeVarDecl(output, member);
      } else {
        writeMethodDecl(output, member);
        output.push(...member.body);
      }
    }
    output.push('}');
    for (let i = 0; i < file.length; i++) {
      const token = file[i];
      if (typeof token === 'string') {
        const name = token.split(/[$@]/)[0];
        file[i] = name;
        if (!globals.has(name) && types) {
          for (const [_, ent] of types.entries()) {
            if (ent.kind === 'enum') {
              const mbr = ent.propertyMap.get(name) || ent.methodMap.get(name);
              if (mbr && (mbr.flags & STATIC_FLAG) !== 0) {
                file[i] = ent.name + '.' + name;
              }
            }
          }
        }
      }
    }
    this.prefix(output, types);
    // Type 'null' is not assignable to type 'String'
    return [...file, ...output].map((token) =>
      token === 'null' ? 'null as any' : token
    );
  }

  private prefix(output: Token[], types?: Map<string, ClassEntry>) {
    for (let i = 0; i < output.length; i++) {
      const token = output[i];

      if (typeof token !== 'string') {
        continue;
      }

      if (token.endsWith('$')) {
        const name = token.substring(0, token.length - 1);
        const prop = this.propertyMap.get(name);

        if (prop) {
          if ((prop.flags & STATIC_FLAG) === 0) {
            output[i] = 'this.' + name;
            continue;
          } else if (this.kind === 'enum') {
            output[i] = this.name + '.' + name;
            continue;
          }
        }

        const dot = name.indexOf('.');
        if (dot !== -1) {
          const key = name.substring(0, dot);
          const prop = this.propertyMap.get(key);
          if (prop && (prop.flags & STATIC_FLAG) == 0) {
            output[i] = 'this.' + name;
            continue;
          } else if (types) {
            const entry = types.get(key);
            if (entry && entry.kind === 'interface') {
              output[i] = name.substring(dot + 1);
              continue;
            }
          }
        }

        output[i] = name;

        continue;
      }

      const index = token.indexOf('@');
      if (index !== -1) {
        const name = token.substring(0, index);
        const method = this.methodMap.get(token);
        if (method) {
          if ((method.flags & STATIC_FLAG) === 0) {
            output[i] = 'this.' + (method._name || method.name);
            continue;
          }
          if (this.kind === 'enum') {
            output[i] = this.name + '.' + name;
            continue;
          }
        }
        const resolved = this.prefixMethodCall(token, types);
        if (resolved !== token) {
          output[i] = 'this.' + resolved;
          continue;
        }
        output[i] = name;
        if (this.kind === 'enum') {
          const argc = token.substring(index + 1).split(':').length;
          for (const [_, method] of this.methodMap.entries()) {
            if (method.name === name && method.args.length === argc) {
              if ((method.flags & exports.STATIC_FLAG) !== 0) {
                output[i] = this.name + '.' + name;
                break;
              }
            }
          }
        }
      }
    }
  }

  prefixMethodCall(token: string, types?: Map<string, ClassEntry>): string {
    const [name, argv] = token.split('@');
    const dot = name.indexOf('.');

    if (dot === -1) {
      const method = this.methodMap.get(token);
      if (method && (method.flags & STATIC_FLAG) === 0) {
        return method._name || method.name;
      }
      if (argv.indexOf('?') !== -1) {
        const argc = argv.split(':').length;
        for (const member of this.members) {
          if (member.name === name && member.kind === 'method') {
            if (
              argc === member.args.length &&
              (member.flags & STATIC_FLAG) == 0
            ) {
              return member._name || member.name;
            }
          }
        }
      }
      return token;
    }

    const key = token.substring(0, dot);
    const property = this.propertyMap.get(key);
    if (property && (property.flags & STATIC_FLAG) === 0) {
      if (types) {
        const entry = types.get(property.type);
        if (entry) {
          const name = token.substring(dot + 1);
          return key + '.' + entry.prefixMethodCall(name, types);
        }
      }
      return name;
    }

    return token;
  }
}

export class ClassParser {
  _tokens: Token[];
  _next: number;
  _entry!: ClassEntry;

  constructor(tokens: Token[]) {
    this._tokens = tokens;
    this._next = 0;
  }

  parse() {
    const entry = this.createClassEntry();
    if (!entry) {
      throw Error('Not a class');
    }
    this._entry = entry;
    if (this.look() === '@') {
      this.skipAnnotation();
    }
    while (this.look() !== '{') {
      // class T implements I
      this.advance();
    }
    this.match('{');
    while (this.look() !== '}') {
      if (this.look() == ';') {
        this.advance();
        continue;
      }
      this.parseMember();
    }
    return this._entry;
  }

  skipAnnotation() {
    this.match('@'); // @
    this.advance(); // @Internal
    if (this.look() === '(') {
      this.advance();
      let level = 1;
      while (level !== 0) {
        if (this.look() === '(') {
          level++;
        } else if (this.look() === ')') {
          level--;
        }
        this.advance();
      }
    }
  }

  createClassEntry(): ClassEntry | null {
    for (let i = 0; i < this._tokens.length; i++) {
      const kind = this._tokens[i];
      if (kind === 'class' || kind === 'enum' || kind === 'interface') {
        if (i === this._tokens.length - 1) {
          return null;
        }
        const name = this._tokens[i + 1];
        if (!isId(name)) {
          throw Error(`Bad class name: ${name}`);
        }
        this.advance(i + 2);
        return new ClassEntry(name as string, kind);
      }
    }
    return null;
  }

  expect(what: string) {
    const lines = [this._entry.name + ':\n'];
    const first = Math.max(0, this._next - 20);
    const last = Math.min(this._next + 20, this._tokens.length);
    for (let i = first; i < last; i++) {
      const star = i === this._next ? '*' : ' ';
      const t = this._tokens[i];
      lines.push(star + ' ' + i + ': ' + (typeof t === 'string' ? t : t.value));
    }
    println(lines.join('\n'));
    return new Error(`expect ${what}, got '${this.look()}'`);
  }

  parseMember() {
    let _static = false;

    if (this.look() === '@') {
      this.skipAnnotation();
    }

    for (let i = this._next; i < this._tokens.length; i++) {
      const token = this._tokens[i] + '';
      if (token === 'static') {
        _static = true;
      } else if (!/^public|protected|private|final$/.test(token)) {
        this._next = i;
        break;
      }
    }

    let decl = this.parseDecl();

    if (!decl) {
      if (this.look() === this._entry.name) {
        decl = { name: 'constructor', type: '', flags: 0, array: 0 };
        this.advance();
      } else if (this._entry.kind === 'enum') {
        const decl = this.parseEnumEntry(new Map());
        this._entry.addProperty({ kind: 'property', ...decl });
        return;
      } else {
        throw this.expect('class member');
      }
    } else if (_static) {
      decl.flags |= STATIC_FLAG;
    }

    if (this.look() === '(') {
      const scope: Scope = new Map();
      const args = this.parseArgs(scope);
      const method: Method = { kind: 'method', ...decl, args, body: [] };
      this._entry.addMethod(method);
      method.body = this.parseMethodBody(scope);
      return;
    }

    for (const entry of this.parseVarDecls(decl, this._entry.propertyMap)) {
      this._entry.addProperty({ kind: 'property', ...entry });
    }

    this.match(';');
  }

  parseDecl(first?: Decl): VarDecl | undefined {
    let type: string;
    let n = 0;
    let flags = 0;
    let array = 0;

    if (!first) {
      type = this.look() as string;
      if (type === 'final') {
        this.advance();
        type = this.look() as string;
      }
      if (!isId(type)) {
        return undefined;
      }
      n += 1;
      while (this.look(n) === '[' && this.look(n + 1) === ']') {
        array++;
        n += 2;
      }
    } else {
      type = first.type;
      flags = first.flags;
    }

    const name = this.look(n++) as string;

    if (!isId(name)) {
      return undefined;
    }

    while (this.look(n) === '[' && this.look(n + 1) === ']') {
      array++;
      n += 2;
    }

    this.advance(n);

    return { type, name, flags, array };
  }

  parseEnumEntry(scope: Scope): VarDecl {
    const name = this.look() as string;
    if (!isId(name)) {
      throw this.expect('enum entry');
    }

    this.advance();

    const decl: VarDecl = {
      name,
      type: this._entry.name,
      flags: STATIC_FLAG | FIRST_FLAG | LAST_FLAG | ENUM_FLAG,
      array: 0
    };

    const value: Token[] = ['new', this._entry.name, '('];

    if (this.look() === '(') {
      this.advance();
      value.push(...this.parseExpr(scope));
      while (this.look() !== ')') {
        value.push(this.match(','));
        value.push(...this.parseExpr(scope));
      }
      this.match(')');
    }

    value.push(')');
    decl.value = value;
    if (this.look() === ';' || this.look() === ',') {
      this.advance();
    } else {
      throw this.expect('[,;]');
    }
    return decl;
  }

  parseVarDecls(first: Decl, scope: Scope) {
    const decls: VarDecl[] = [];

    let decl: VarDecl = { ...first };
    decl.flags |= FIRST_FLAG;

    while (true) {
      if (scope) {
        scope.set(decl.name, decl);
      }

      if (this.look() === '=') {
        this.advance();
        decl.value = this.parseExpr(scope);
      }

      decls.push(decl);

      if (this.look() === ':') {
        break;
      }

      if (this.look() === ';') {
        decl.flags |= LAST_FLAG;
        break;
      }

      this.match(',');

      if (!(decl = this.parseDecl(first)!)) {
        throw this.expect('decl');
      }

      decl.flags &= ~FIRST_FLAG;
    }

    return decls;
  }

  parseArgs(scope: Scope): VarDecl[] {
    const args: VarDecl[] = [];
    this.match('(');
    while (this.look() !== ')') {
      const decl = this.parseDecl();
      if (!decl) {
        throw this.expect('arg');
      }
      args.push(decl);
      scope.set(decl.name, decl);
      if (this.look() === ',') {
        this.advance();
      }
    }
    this.match(')');
    return args;
  }

  // Note: No support for ',' operator
  parseStmt(scope: Scope): Token[] {
    const token = this.look();

    if (token === 'for') {
      return this.parseFor(scope);
    }

    if (token === 'if') {
      return this.parseIf(scope);
    }

    if (token === 'do') {
      return this.parseDo(scope);
    }

    if (token === 'while') {
      return this.parseWhile(scope);
    }

    if (token === 'switch') {
      return this.parseSwitch(scope);
    }

    if (token === 'try') {
      return this.parseTry(scope);
    }

    if (isId(token) && this.look(1) === ':') {
      this.advance(2);
      return [token, ':'];
    }

    if (this.look() === ';') {
      this.advance();
      return [';'];
    }

    const result = this.parseExpr(scope);
    if (this.look() === ';' || this.look() === ':') {
      result.push(this.look());
      this.advance();
    } else {
      throw this.expect('[:;]');
    }
    return result;
  }

  // Note: No support for ',' operator
  parseExpr(scope: Scope): Token[] {
    const result = [];
    let level = 0;
    while (!/^[,;}]$/.test(this.look() + '') || level > 0) {
      const token = this.look();
      if (token === 'new') {
        result.push(...this.parseNew(scope));
        continue;
      }

      // Hack for switch stmt:
      if (token === 'case') {
        result.push(token);
        this.advance();
        result.push(this.look());
        this.advance();
        break;
      }

      if (token === 'default') {
        result.push(token);
        this.advance();
        break;
      }

      if (token === '{') {
        // array: values = {1,2,3,}
        this.advance();
        result.push('[');
        while (this.look() !== '}') {
          if (this.look() === ',') {
            result.push(this.match(','));
            continue;
          }
          const expr = this.parseExpr(scope);
          if (expr.length === 0) {
            throw this.expect('expr');
          }
          result.push(...expr);
        }
        this.match('}');
        result.push(']');
        break;
      }

      if (isId(token) && this.look(1) === '(') {
        if (/\.length$/.test(token as string) && this.look(2) === ')') {
          // Hack for string.length, array.length
          result.push(token);
          this.advance(3);
          continue;
        }

        result.push(...this.parseFcall(scope));
        continue;
      }

      if (
        token === '(' &&
        isId(this.look(1)) &&
        this.look(2) === ')' &&
        (isId(this.look(3)) || this.look(3) === '(')
      ) {
        this.advance(3);
        continue;
      }

      if (token === '(' || token === '[') {
        level++;
      }

      if (token === ')' || token === ']') {
        level--;
        if (level < 0) {
          break;
        }
      }

      result.push(this.prefix(token, scope));

      this.advance();
    }
    return result;
  }

  prefix(token: Token, scope: Scope): Token {
    if (typeof token !== 'string' || !isId(token)) return token;
    const key = token.split('.')[0];
    if (
      typeof token === 'string' &&
      (scope === this._entry.propertyMap || !scope.has(key))
    ) {
      return token + '$';
    }
    return token;
  }

  match(token: string): string {
    if (this.look() !== token) {
      throw this.expect(token);
    }
    this.advance();
    return token;
  }

  look(n = 0) {
    return this._tokens[this._next + n];
  }

  advance(n = 1) {
    if ((this._next += n) > this._tokens.length) {
      throw Error(`Bad advancing`);
    }
  }

  parseMethodBody(scope: Scope): Token[] {
    if (this._entry.kind === 'interface' && this.look() === ';') {
      this.advance();
      return [';'];
    }

    while (this.look() && this.look() !== '{') {
      this.advance();
    }

    return this.parseBlock(scope);
  }

  parseBlock(scope: Scope): Token[] {
    const result = [];
    result.push(this.match('{'));
    while (this.look() !== '}') {
      const decl = this.parseDecl();
      if (decl) {
        result.push('var');
        for (const entry of this.parseVarDecls(decl, scope)) {
          writeVarDecl(result, entry);
        }
        this.match(';');
        continue;
      }

      if (this.look() === '{') {
        result.push(...this.parseBlock(scope));
        continue;
      }

      result.push(...this.parseStmt(scope));
    }

    result.push(this.match('}'));

    return result;
  }

  parseNew(scope: Scope): Token[] {
    this.match('new');

    const type = this.look();

    if (!isId(type)) {
      throw this.expect('type');
    }

    this.advance();

    const tmp: Token[] = [];
    if (this.look() === '<') {
      tmp.push(this.match('<'));
      while (this.look() !== '>') {
        tmp.push(this.look());
        this.advance();
      }
      tmp.push(this.match('>'));
    }
    if (this.look() === '(') {
      return ['new', type, ...tmp, ...this.parseExpr(scope)];
    }

    this.match('[');

    const result: Token[] = [];

    if (this.look() == ']') {
      this.match(']');

      // new byte[] {1,2,3} => [1,2,3]
      this.match('{');
      result.push('[');

      while (true) {
        result.push(...this.parseExpr(scope));
        if (this.look() === ',') {
          result.push(',');
          this.advance();
        } else if (this.look() === '}') {
          break;
        } else {
          throw this.expect(',/;/}');
        }
      }

      result.push(']');
      this.match('}');

      return result;
    }

    // new int[100] => new_int(100)
    // result.push(`new_${type}`);
    result.push(`new_any`);
    result.push('(');
    result.push(...this.parseExpr(scope));
    result.push(')');
    this.match(']');

    return result;
  }

  // todo: handle "for (i=0;i<1;i++) ...
  parseFor(scope: Scope): Token[] {
    const result = [];
    result.push(this.match('for'));
    result.push(this.match('('));
    const decl = this.parseDecl();
    if (decl) {
      scope.set(decl.name, decl);
      result.push('let');
      const vars = this.parseVarDecls(decl, scope);
      if (this.look() !== ':') {
        for (const entry of vars) {
          writeVarDecl(result, entry);
        }
      } else {
        if (vars.length !== 1 || vars[0].value) {
          throw this.expect('simple var');
        }
        result.push(vars[0].name);
      }
    } else if (this.look() === ';') {
      result.push(';'); // matched again below
    } else {
      result.push(...this.parseExpr(scope));
    }

    if (this.look() === ':') {
      result.push('of');
      this.advance();
      result.push(...this.parseExpr(scope));
    } else {
      this.match(';');
      result.push(...this.parseExpr(scope));
      result.push(this.match(';'));
      result.push(...this.parseExpr(scope));
    }
    result.push(this.match(')'));
    if (this.look() === '{') {
      result.push(...this.parseBlock(scope));
    } else {
      result.push(...this.parseStmt(scope));
    }
    return result;
  }

  parseIf(scope: Scope): Token[] {
    const result = [];
    result.push(this.match('if'));
    result.push(this.match('('));
    result.push(...this.parseExpr(scope));
    result.push(this.match(')'));
    if (this.look() === '{') {
      result.push(...this.parseBlock(scope));
    } else {
      result.push(...this.parseStmt(scope));
    }
    while (this.look() === 'else') {
      result.push('else');
      this.advance();
      if (this.look() === '{') {
        result.push(...this.parseBlock(scope));
      } else {
        result.push(...this.parseStmt(scope));
      }
    }
    return result;
  }

  parseDo(scope: Scope): Token[] {
    const result = [];
    result.push(this.match('do'));
    if (this.look() === '{') {
      result.push(...this.parseBlock(scope));
    } else {
      result.push(...this.parseStmt(scope));
    }
    result.push(this.match('while'));
    result.push(...this.parseExpr(scope));
    result.push(this.match(';'));
    return result;
  }

  parseTry(scope: Scope): Token[] {
    const result = [];
    result.push(this.match('try'));
    result.push(...this.parseBlock(scope));
    while (this.look() === 'catch') {
      result.push(this.match('catch'));
      result.push(this.match('('));
      let tokens: Token[] = [];
      while (this.look() !== ')') {
        tokens.push(this.look());
        this.advance();
      }
      result.push(tokens.pop() as Token);
      // result.push(':');
      // result.push(...tokens);
      result.push(this.match(')'));
      result.push(...this.parseBlock(scope));
    }
    if (this.look() === 'finally') {
      result.push(this.match('finally'));
      result.push(...this.parseBlock(scope));
    }
    return result;
  }

  parseWhile(scope: Scope): Token[] {
    const result = [];
    result.push(this.match('while'));
    result.push(this.match('('));
    result.push(...this.parseExpr(scope));
    result.push(this.match(')'));
    if (this.look() === '{') {
      result.push(...this.parseBlock(scope));
    } else {
      result.push(...this.parseStmt(scope));
    }
    return result;
  }

  parseSwitch(scope: Scope): Token[] {
    const result = [];
    result.push(this.match('switch'));
    result.push(this.match('('));
    result.push(...this.parseExpr(scope));
    result.push(this.match(')'));
    result.push(...this.parseBlock(scope));
    return result;
  }

  parseFcall(scope: Scope): Token[] {
    const result: Token[] = [];
    const name = this.look() as string;
    this.advance();
    result.push(this.match('('));
    const types = [];
    while (this.look() !== ')') {
      if (types.length > 0) {
        result.push(this.match(','));
      }
      const expr = this.parseExpr(scope);
      result.push(...expr);
      types.push(this.getExprType(expr, scope));
    }
    result.push(this.match(')'));
    result.unshift(`${name}@${types.join(':')}`);
    return result;
  }

  getExprType(expr: Token[], scope: Scope) {
    let token: Token | undefined;

    if (expr.length === 1) {
      token = expr[0];
    } else if (expr[0] === 'new') {
      return expr[1];
    }

    if (token && typeof token === 'string') {
      const decl = scope.get(token);
      if (decl) {
        return decl.type;
      }
      const prop = this._entry.propertyMap.get(token.replace(/\$$/, ''));
      if (prop) {
        return prop.type;
      }
      if (/^-?\d+$/.test(token)) {
        return 'int';
      }
      // todo: add float/double/boolean/etc
    }

    return '?';
  }
}

function writeDeclType(output: Token[], decl: Decl) {
  let type = decl.type;
  for (let i = 0; i < decl.array; i++) {
    type += '[]';
  }
  output.push(':', type);
}

function writeVarDecl(output: Token[], decl: VarDecl) {
  const flags = decl.flags;

  if ((flags & FIRST_FLAG) !== 0) {
    if ((flags & STATIC_FLAG) !== 0) {
      output.push('static');
    }
  } else {
    output.push(',');
  }

  if ((decl.flags & ASSERT_FLAG) !== 0) {
    output.push(decl.name + '!');
  } else {
    output.push(decl.name);
  }

  writeDeclType(output, decl);

  if (decl.value) {
    output.push('=');
    output.push(...decl.value);
  }

  if ((flags & LAST_FLAG) !== 0) {
    output.push(';');
  }
}

function writeMethodDecl(output: Token[], method: Method) {
  const flags = method.flags;

  if ((flags & STATIC_FLAG) !== 0) {
    output.push('static');
  }

  output.push(method._name || method.name);
  output.push('(');

  let i = 0;
  for (const arg of method.args) {
    if (i++ > 0) output.push(',');
    output.push(arg.name);
    writeDeclType(output, arg);
  }

  output.push(')');
  if (method.type) {
    writeDeclType(output, method);
  }
}

const println = console.log;
