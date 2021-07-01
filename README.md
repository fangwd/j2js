
# Introduction

A tool that help convert Java code to Javascript.

j2js was written to help convert Java code genearated by [bison](https://www.gnu.org/software/bison/) into Typescript.

Supported features:
- nested classes, enum, interface
- method overloading
- commaon language structures (if, for, do, while, switch, try/catch)
- arrays

Note: at the moment **annotations are not supported** (there is an explicit `skipAnnotation` method in parser.ts).

# Usage
After downloading the source, run the following:
```
$ npm install
$ npm run build
$ node build/j2.js <file.java>
```

