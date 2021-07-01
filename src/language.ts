import { Token } from './lexer';

export function isReserved(token: string) {
  return /^abstract|continue|for|new|switch|assert|default|goto|package|synchronized|boolean|do|if|private|this|break|double|implements|protected|throw|byte|else|import|public|throws|case|enum|instanceof|return|transient|catch|extends|int|short|try|char|final|interface|static|void|class|finally|long|strictfp|volatile|const|float|native|super|while$/.test(
    token
  );
}

export function isId(token: Token) {
  if (typeof token === 'string') {
    if (/^(new|return|case|break|continue|throw)$/.test(token)) {
      return false;
    }
    return /^[a-zA-Z_]([\w.]*\w)?$/.test(token);
  }
  return false;
}

export function joinTokens(
  tokens: Token[],
  rename?: { [key: string]: string }
) {
  const lines = [];
  const line: string[] = [];

  for (const token of tokens) {
    let entry = typeof token === 'string' ? token : token.value;
    if (rename && rename[entry]) {
      if (typeof rename[entry] === 'string') {
        entry = rename[entry];
      }
    }
    line.push(entry);
    if (/^[{};]$/.test(token + '')) {
      lines.push(line.join(' '));
      line.length = 0;
    }
  }
  return lines.join('\n');
}
