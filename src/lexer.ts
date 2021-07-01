export type Token = string | { type: string; value: string };

export default class Lexer {
  source: string;
  cursor: number;

  token: number;

  constructor(source: string) {
    this.source = source;
    this.cursor = 0;
    this.token = -1;
  }

  lexComment() {
    const type = this.yytext();
    const length = this.source.length;
    if (type === '//') {
      let i = this.cursor;
      while (i < length) {
        if (this.charAt(i++) === '\n') {
          break;
        }
      }
      this.cursor = i;
      return true;
    } else if (type === '/*') {
      let i = this.cursor;
      while (i < length) {
        const c = this.charAt(i++);
        if (c !== '*') {
          continue;
        }
        if (this.charAt(i) === '/') {
          this.cursor = i + 1;
          return true;
        }
      }
    }
    return false;
  }

  lex(all = false): Token | undefined {
    let state = 1;
    let marker = this.cursor;
    let yych = '';
    let yyaccept = 0;
    this.token = this.cursor;
    while (1) {
      switch (state) {
        case 1 /*var yych*/:
          yyaccept = 0;
          yych = this.charAt(this.cursor);
          switch (yych) {
            case '\t':
            case '\n':
            case '\v':
            case '\r':
            case ' ': {
              state = 4;
              continue;
            }
            case '!':
            case '%':
            case '*':
            case '=':
            case '^': {
              state = 6;
              continue;
            }
            case '"': {
              state = 8;
              continue;
            }
            case '&': {
              state = 10;
              continue;
            }
            case "'": {
              state = 11;
              continue;
            }
            case '(':
            case ')':
            case ',':
            case ':':
            case ';':
            case '?':
            case '@':
            case '[':
            case ']':
            case '{':
            case '}':
            case '~': {
              state = 12;
              continue;
            }
            case '+': {
              state = 13;
              continue;
            }
            case '-': {
              state = 14;
              continue;
            }
            case '.': {
              state = 15;
              continue;
            }
            case '/': {
              state = 16;
              continue;
            }
            case '0': {
              state = 17;
              continue;
            }
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
            case '8':
            case '9': {
              state = 19;
              continue;
            }
            case '<': {
              state = 21;
              continue;
            }
            case '>': {
              state = 22;
              continue;
            }
            case 'A':
            case 'B':
            case 'C':
            case 'D':
            case 'F':
            case 'G':
            case 'H':
            case 'I':
            case 'J':
            case 'K':
            case 'L':
            case 'M':
            case 'N':
            case 'O':
            case 'P':
            case 'Q':
            case 'R':
            case 'S':
            case 'T':
            case 'U':
            case 'V':
            case 'W':
            case 'X':
            case 'Y':
            case 'Z':
            case '_':
            case 'a':
            case 'b':
            case 'c':
            case 'd':
            case 'f':
            case 'g':
            case 'h':
            case 'i':
            case 'j':
            case 'k':
            case 'l':
            case 'm':
            case 'n':
            case 'o':
            case 'p':
            case 'q':
            case 'r':
            case 's':
            case 't':
            case 'u':
            case 'v':
            case 'w':
            case 'x':
            case 'y':
            case 'z': {
              state = 23;
              continue;
            }
            case 'E':
            case 'e': {
              state = 26;
              continue;
            }
            case '|': {
              state = 27;
              continue;
            }
            default: {
              state = 2;
              continue;
            }
          }
        case 2:
          ++this.cursor;
        case 3: {
          if (this.token >= this.source.length) return undefined;
          throw this.error();
        }
        case 4:
          ++this.cursor;
          {
            if (all) return { type: 'space', value: this.yytext() };
            this.token = this.cursor;
            state = 1;
            continue;
          }
        case 6:
          yych = this.charAt(++this.cursor);
          if (yych == '=') {
            state = 12;
            continue;
          }
        case 7: {
          return this.yytext();
        }
        case 8:
          yych = this.charAt(++this.cursor);
          if (yych == '"') {
            state = 28;
            continue;
          }
          if (yych == '\\') {
            state = 30;
            continue;
          }
          {
            state = 8;
            continue;
          }
        case 10:
          yych = this.charAt(++this.cursor);
          if (yych == '&') {
            state = 12;
            continue;
          }
          if (yych == '=') {
            state = 12;
            continue;
          }
          {
            state = 3;
            continue;
          }
        case 11:
          yyaccept = 0;
          yych = this.charAt((marker = ++this.cursor));
          if (yych <= '[') {
            if (yych == "'") {
              state = 3;
              continue;
            }
            {
              state = 32;
              continue;
            }
          } else {
            if (yych <= '\\') {
              state = 34;
              continue;
            }
            if (yych <= String.fromCharCode(0xd7ff)) {
              state = 32;
              continue;
            }
            if (yych <= String.fromCharCode(0xdbff)) {
              state = 35;
              continue;
            }
            {
              state = 32;
              continue;
            }
          }
        case 12:
          ++this.cursor;
          {
            state = 7;
            continue;
          }
        case 13:
          yych = this.charAt(++this.cursor);
          if (yych == '+') {
            state = 12;
            continue;
          }
          if (yych == '=') {
            state = 12;
            continue;
          }
          {
            state = 7;
            continue;
          }
        case 14:
          yych = this.charAt(++this.cursor);
          if (yych == '-') {
            state = 12;
            continue;
          }
          if (yych == '=') {
            state = 12;
            continue;
          }
          {
            state = 7;
            continue;
          }
        case 15:
          yyaccept = 1;
          yych = this.charAt((marker = ++this.cursor));
          if (yych == '.') {
            state = 36;
            continue;
          }
          if (yych <= '/') {
            state = 7;
            continue;
          }
          if (yych <= '9') {
            state = 37;
            continue;
          }
          {
            state = 7;
            continue;
          }
        case 16:
          yych = this.charAt(++this.cursor);
          if (yych <= '.') {
            if (yych == '*') {
              state = 39;
              continue;
            }
            {
              state = 7;
              continue;
            }
          } else {
            if (yych <= '/') {
              state = 39;
              continue;
            }
            if (yych == '=') {
              state = 12;
              continue;
            }
            {
              state = 7;
              continue;
            }
          }
        case 17:
          yyaccept = 2;
          yych = this.charAt((marker = ++this.cursor));
          if (yych == 'X') {
            state = 46;
            continue;
          }
          if (yych == 'x') {
            state = 46;
            continue;
          }
          {
            state = 42;
            continue;
          }
        case 18: {
          return this.yytext();
        }
        case 19:
          yyaccept = 2;
          yych = this.charAt((marker = ++this.cursor));
          if (yych <= '9') {
            if (yych == '.') {
              state = 37;
              continue;
            }
            if (yych <= '/') {
              state = 18;
              continue;
            }
            {
              state = 19;
              continue;
            }
          } else {
            if (yych <= 'E') {
              if (yych <= 'D') {
                state = 18;
                continue;
              }
              {
                state = 45;
                continue;
              }
            } else {
              if (yych == 'e') {
                state = 45;
                continue;
              }
              {
                state = 18;
                continue;
              }
            }
          }
        case 21:
          yych = this.charAt(++this.cursor);
          if (yych <= ';') {
            state = 7;
            continue;
          }
          if (yych <= '<') {
            state = 6;
            continue;
          }
          if (yych <= '=') {
            state = 12;
            continue;
          }
          {
            state = 7;
            continue;
          }
        case 22:
          yych = this.charAt(++this.cursor);
          if (yych <= '<') {
            state = 7;
            continue;
          }
          if (yych <= '=') {
            state = 12;
            continue;
          }
          if (yych <= '>') {
            state = 6;
            continue;
          }
          {
            state = 7;
            continue;
          }
        case 23:
          yyaccept = 3;
          yych = this.charAt((marker = ++this.cursor));
        case 24:
          if (yych <= '@') {
            if (yych <= '.') {
              if (yych >= '.') {
                state = 47;
                continue;
              }
            } else {
              if (yych <= '/') {
                state = 25;
                continue;
              }
              if (yych <= '9') {
                state = 23;
                continue;
              }
            }
          } else {
            if (yych <= '_') {
              if (yych <= 'Z') {
                state = 23;
                continue;
              }
              if (yych >= '_') {
                state = 23;
                continue;
              }
            } else {
              if (yych <= '`') {
                state = 25;
                continue;
              }
              if (yych <= 'z') {
                state = 23;
                continue;
              }
            }
          }
        case 25: {
          return this.yytext();
        }
        case 26:
          yyaccept = 3;
          yych = this.charAt((marker = ++this.cursor));
          if (yych <= ',') {
            if (yych == '+') {
              state = 48;
              continue;
            }
            {
              state = 24;
              continue;
            }
          } else {
            if (yych <= '-') {
              state = 48;
              continue;
            }
            if (yych <= '/') {
              state = 24;
              continue;
            }
            if (yych <= '9') {
              state = 49;
              continue;
            }
            {
              state = 24;
              continue;
            }
          }
        case 27:
          yych = this.charAt(++this.cursor);
          if (yych == '=') {
            state = 12;
            continue;
          }
          if (yych == '|') {
            state = 12;
            continue;
          }
          {
            state = 7;
            continue;
          }
        case 28:
          ++this.cursor;
        case 29: {
          return { type: 'literal', value: this.yytext() };
        }
        case 30:
          yych = this.charAt(++this.cursor);
          if (yych == '\\') {
            state = 30;
            continue;
          }
          {
            state = 8;
            continue;
          }
        case 32:
          yych = this.charAt(++this.cursor);
          if (yych == "'") {
            state = 28;
            continue;
          }
        case 33:
          this.cursor = marker;
          if (yyaccept <= 1) {
            if (yyaccept == 0) {
              {
                state = 3;
                continue;
              }
            } else {
              {
                state = 7;
                continue;
              }
            }
          } else {
            if (yyaccept == 2) {
              {
                state = 18;
                continue;
              }
            } else {
              {
                state = 25;
                continue;
              }
            }
          }
        case 34:
          yych = this.charAt(++this.cursor);
          if (yych <= '&') {
            if (yych == '\n') {
              state = 33;
              continue;
            }
            {
              state = 32;
              continue;
            }
          } else {
            if (yych <= "'") {
              state = 51;
              continue;
            }
            if (yych <= String.fromCharCode(0xd7ff)) {
              state = 32;
              continue;
            }
            if (yych >= String.fromCharCode(0xdc00)) {
              state = 32;
              continue;
            }
          }
        case 35:
          yych = this.charAt(++this.cursor);
          if (yych == "'") {
            state = 28;
            continue;
          }
          if (yych <= String.fromCharCode(0xdbff)) {
            state = 33;
            continue;
          }
          if (yych <= String.fromCharCode(0xdfff)) {
            state = 32;
            continue;
          }
          {
            state = 33;
            continue;
          }
        case 36:
          yych = this.charAt(++this.cursor);
          if (yych == '.') {
            state = 12;
            continue;
          }
          {
            state = 33;
            continue;
          }
        case 37:
          yyaccept = 2;
          yych = this.charAt((marker = ++this.cursor));
          if (yych <= 'K') {
            if (yych <= 'D') {
              if (yych <= '/') {
                state = 18;
                continue;
              }
              if (yych <= '9') {
                state = 37;
                continue;
              }
              {
                state = 18;
                continue;
              }
            } else {
              if (yych <= 'E') {
                state = 45;
                continue;
              }
              if (yych <= 'F') {
                state = 52;
                continue;
              }
              {
                state = 18;
                continue;
              }
            }
          } else {
            if (yych <= 'e') {
              if (yych <= 'L') {
                state = 52;
                continue;
              }
              if (yych <= 'd') {
                state = 18;
                continue;
              }
              {
                state = 45;
                continue;
              }
            } else {
              if (yych <= 'f') {
                state = 52;
                continue;
              }
              if (yych == 'l') {
                state = 52;
                continue;
              }
              {
                state = 18;
                continue;
              }
            }
          }
        case 39:
          ++this.cursor;
          {
            if (!this.lexComment()) throw this.error();
            if (all) return { type: 'comment', value: this.yytext() };
            this.token = this.cursor;
            state = 1;
            continue;
          }
        case 41:
          yyaccept = 2;
          yych = this.charAt((marker = ++this.cursor));
        case 42:
          if (yych <= '9') {
            if (yych <= '.') {
              if (yych <= '-') {
                state = 18;
                continue;
              }
              {
                state = 37;
                continue;
              }
            } else {
              if (yych <= '/') {
                state = 18;
                continue;
              }
              if (yych <= '7') {
                state = 41;
                continue;
              }
            }
          } else {
            if (yych <= 'E') {
              if (yych <= 'D') {
                state = 18;
                continue;
              }
              {
                state = 45;
                continue;
              }
            } else {
              if (yych == 'e') {
                state = 45;
                continue;
              }
              {
                state = 18;
                continue;
              }
            }
          }
        case 43:
          yych = this.charAt(++this.cursor);
          if (yych <= '9') {
            if (yych == '.') {
              state = 37;
              continue;
            }
            if (yych <= '/') {
              state = 33;
              continue;
            }
            {
              state = 43;
              continue;
            }
          } else {
            if (yych <= 'E') {
              if (yych <= 'D') {
                state = 33;
                continue;
              }
            } else {
              if (yych != 'e') {
                state = 33;
                continue;
              }
            }
          }
        case 45:
          yych = this.charAt(++this.cursor);
          if (yych <= ',') {
            if (yych == '+') {
              state = 53;
              continue;
            }
            {
              state = 33;
              continue;
            }
          } else {
            if (yych <= '-') {
              state = 53;
              continue;
            }
            if (yych <= '/') {
              state = 33;
              continue;
            }
            if (yych <= '9') {
              state = 54;
              continue;
            }
            {
              state = 33;
              continue;
            }
          }
        case 46:
          yych = this.charAt(++this.cursor);
          if (yych <= '@') {
            if (yych <= '/') {
              state = 33;
              continue;
            }
            if (yych <= '9') {
              state = 56;
              continue;
            }
            {
              state = 33;
              continue;
            }
          } else {
            if (yych <= 'F') {
              state = 56;
              continue;
            }
            if (yych <= '`') {
              state = 33;
              continue;
            }
            if (yych <= 'f') {
              state = 56;
              continue;
            }
            {
              state = 33;
              continue;
            }
          }
        case 47:
          yych = this.charAt(++this.cursor);
          if (yych <= '^') {
            if (yych <= '@') {
              state = 33;
              continue;
            }
            if (yych <= 'Z') {
              state = 23;
              continue;
            }
            {
              state = 33;
              continue;
            }
          } else {
            if (yych == '`') {
              state = 33;
              continue;
            }
            if (yych <= 'z') {
              state = 23;
              continue;
            }
            {
              state = 33;
              continue;
            }
          }
        case 48:
          yych = this.charAt(++this.cursor);
          if (yych <= '/') {
            state = 33;
            continue;
          }
          if (yych <= '9') {
            state = 58;
            continue;
          }
          {
            state = 33;
            continue;
          }
        case 49:
          yyaccept = 2;
          yych = this.charAt((marker = ++this.cursor));
          if (yych <= '@') {
            if (yych <= '.') {
              if (yych <= '-') {
                state = 18;
                continue;
              }
              {
                state = 47;
                continue;
              }
            } else {
              if (yych <= '/') {
                state = 18;
                continue;
              }
              if (yych <= '9') {
                state = 49;
                continue;
              }
              {
                state = 18;
                continue;
              }
            }
          } else {
            if (yych <= '_') {
              if (yych <= 'Z') {
                state = 23;
                continue;
              }
              if (yych <= '^') {
                state = 18;
                continue;
              }
              {
                state = 23;
                continue;
              }
            } else {
              if (yych <= '`') {
                state = 18;
                continue;
              }
              if (yych <= 'z') {
                state = 23;
                continue;
              }
              {
                state = 18;
                continue;
              }
            }
          }
        case 51:
          yych = this.charAt(++this.cursor);
          if (yych == "'") {
            state = 28;
            continue;
          }
          {
            state = 29;
            continue;
          }
        case 52:
          ++this.cursor;
          {
            state = 18;
            continue;
          }
        case 53:
          yych = this.charAt(++this.cursor);
          if (yych <= '/') {
            state = 33;
            continue;
          }
          if (yych >= ':') {
            state = 33;
            continue;
          }
        case 54:
          yych = this.charAt(++this.cursor);
          if (yych <= 'K') {
            if (yych <= '9') {
              if (yych <= '/') {
                state = 18;
                continue;
              }
              {
                state = 54;
                continue;
              }
            } else {
              if (yych == 'F') {
                state = 52;
                continue;
              }
              {
                state = 18;
                continue;
              }
            }
          } else {
            if (yych <= 'f') {
              if (yych <= 'L') {
                state = 52;
                continue;
              }
              if (yych <= 'e') {
                state = 18;
                continue;
              }
              {
                state = 52;
                continue;
              }
            } else {
              if (yych == 'l') {
                state = 52;
                continue;
              }
              {
                state = 18;
                continue;
              }
            }
          }
        case 56:
          yych = this.charAt(++this.cursor);
          if (yych <= '@') {
            if (yych <= '/') {
              state = 18;
              continue;
            }
            if (yych <= '9') {
              state = 56;
              continue;
            }
            {
              state = 18;
              continue;
            }
          } else {
            if (yych <= 'F') {
              state = 56;
              continue;
            }
            if (yych <= '`') {
              state = 18;
              continue;
            }
            if (yych <= 'f') {
              state = 56;
              continue;
            }
            {
              state = 18;
              continue;
            }
          }
        case 58:
          yych = this.charAt(++this.cursor);
          if (yych <= '/') {
            state = 18;
            continue;
          }
          if (yych <= '9') {
            state = 58;
            continue;
          }
          {
            state = 18;
            continue;
          }
      }
    }
  }

  charAt(cursor: number) {
    return this.source.charAt(cursor);
  }

  yytext() {
    return this.source.substring(this.token, this.cursor);
  }

  error() {
    return new Error(
      this.source.substring(this.token, this.token + 60) +
        ` (at ${this.cursor}/${this.source.length})`
    );
  }
}

export function lexall(line: string) {
  const lexer = new Lexer(line);
  const tokens: Token[] = [];
  for (let token = lexer.lex(); token !== undefined; token = lexer.lex()) {
    tokens.push(token);
  }
  return tokens;
}
