import Lexer from './lexer';

test('lex', () => {
  const lexer = new Lexer(`abc == 123 /* cool */ 'x' '\\'' '\\t' "\\"" `);
  const tokens = [];
  for (let token = lexer.lex(); token !== undefined; token = lexer.lex()) {
    tokens.push(token);
  }
  expect(tokens).toEqual([
    'abc',
    '==',
    '123',
    { type: 'literal', value: "'x'" },
    { type: 'literal', value: "'\\''" },
    { type: 'literal', value: "'\\t'" },
    { type: 'literal', value: '"\\""' }
  ]);
});

test('lex #2', () => {
  const lexer = new Lexer(`/*A*/F//B\n\n//X`);
  const tokens = [];
  for (let token = lexer.lex(true); token !== undefined; token = lexer.lex(true)) {
    tokens.push(token);
  }
  expect(tokens).toEqual([
    { type: 'comment', value: "/*A*/" },
    "F",
    { type: 'comment', value: "//B\n" },
    { type: 'space', value: "\n" },
    { type: 'comment', value: "//X" },
  ]);
});

test('annotation', () => {
  const lexer = new Lexer(`@Test class`);
  const tokens = [];
  for (
    let token = lexer.lex(true);
    token !== undefined;
    token = lexer.lex(true)
  ) {
    tokens.push(token);
  }
  expect(tokens).toEqual([
    '@',
    'Test',
    {
      type: 'space',
      value: ' ',
    },
    'class',
  ]);
});