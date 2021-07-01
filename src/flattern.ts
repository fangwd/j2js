import { Token } from './lexer';
import { isReserved } from './language';

type Kind = 'class' | 'enum' | 'interface';

export interface TypeSource {
  name: string;
  kind: Kind;
  tokens: Token[];
  level: number;
}

export function flatternFile(tokens: Token[]): TypeSource[] {
  const result: TypeSource[] = [];
  const stack: TypeSource[] = [];
  let index = 0;
  let level = 0;

  let current: TypeSource = {
    kind: 'class',
    name: 'dummy',
    tokens: [],
    level: -1
  };

  stack.push(current);

  while (index < tokens.length) {
    const token = tokens[index++];
    if (token === 'import') {
      while (index < tokens.length && tokens[index] !== ';') {
        index++;
      }
      index++;
      continue;
    }
    if (token === 'class' || token === 'enum' || token === 'interface') {
      const entry: TypeSource = {
        name: tokens[index] as string,
        kind: token,
        level: current.level + 1,
        tokens: [token, tokens[index++]]
      };

      while (current.tokens.length > 0) {
        const last = current.tokens[current.tokens.length - 1];
        if (typeof last !== 'string' || !isReserved(last)) {
          break;
        }
        entry.tokens.unshift(last);
        current.tokens.pop();
      }

      result.push(entry);
      stack.push(current);
      current = entry;
      level = current.level;
      continue;
    }

    current.tokens.push(token);

    if (token === '{') {
      level++;
    } else if (token === '}') {
      level--;
      if (level === current.level) {
        current = stack.pop() as TypeSource;
      }
    }
  }

  return result;
}
