import * as fs from 'fs';
import { flatternFile } from './flattern';
import { lexall } from './lexer';
import { ClassParser, ClassEntry } from './parser';
import { joinTokens } from './language';

const argv = process.argv;
const input = argv[2];
const print = console.log;

// Tokenise the source file
const source = lexall(fs.readFileSync(input).toString());

// Renames, e.g. System.out => util.stream
const rename = {};

// imports/typedefs
const prelude = [
  'type int=number;',
  'type short=number;',
  'type byte=number;',
  'type float=number;',
  'type double=number;',
];

// A list of type (class/enum) entries
const types = flatternFile(source);

console.log(types)
// Typescript lines
const lines = [...prelude];
const typeMap: Map<string, ClassEntry> = new Map();

for (const type of types) {
  const parser = new ClassParser(type.tokens);
  const entry = parser.parse();
  typeMap.set(entry.name, entry);
}

// Types to be exported from this file
// TODO: Make this configurable
const toExport = new Set([]);

for (const type of types) {
  const entry = typeMap.get(type.name);
  if (entry) {
    lines.push(joinTokens(entry.js(typeMap, toExport), rename));
  }
}

print(lines.join('\n'));
