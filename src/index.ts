#!/usr/bin/env node
import glob from "glob";
import ts, { FileReference } from "typescript";
import { Graph } from "./graph";
import { readFileSync, existsSync } from "fs";
import { dirname, join, relative } from "path";
import { promisify } from "util";
import * as yargs from "yargs";

const globProm = promisify(glob);

const g = new Graph();
const g_folders = new Graph();
const checkedFiles = new Set();

const cache: { [index: string]: string[] } = {}
export function getCachedImportsForFile(file: string) {
  if (!cache[file]) {
    cache[file] = getImportsForFile(file);
  }
  return cache[file];
}

const argv = yargs.options({
  start: { type: 'string' },
  aggregate_by_folder: { type: 'boolean', default:false },
  basePath: { type: 'string', default: process.cwd() },
}).argv;

// export async function start(start_path: string) {
//   const all_files = await getSrcFiles(start_path);
//   all_files.forEach(f => checkFile(f))
//   console.log(g.to_dot())
// }

let start_filo = argv.start;
let basePath = argv.basePath;

export async function start_scan(start_file: string) {
  checkFile(start_file)

  if(argv.aggregate_by_folder){
    console.log(g_folders.to_dot(dirname(relative(basePath, start_file))))
  }else{
    console.log(g.to_dot(relative(basePath, start_file)))
  }
  
}
void start_scan(start_filo!);

export async function getSrcFiles(srcRoot: string) {
  const files = await globProm(`${srcRoot}/**/*.ts`);
  return files
    .filter(file => !file.endsWith(".d.ts"))
}

function checkFile(fileName: string) {
  const imports = getCachedImportsForFile(fileName)

  const nextLevel: string[] = [];
  imports.forEach(importFile => {
    if(!checkedFiles.has(importFile)){
      checkedFiles.add(importFile);
      nextLevel.push(importFile);
      g.add_edge({node1: {path: relative(basePath, fileName)}, node2: {path: relative(basePath, importFile)}});
    }

    let folder1 = dirname(relative(basePath, fileName));
    let folder2 = dirname(relative(basePath, importFile));

    if(folder1 !== folder2){
      g_folders.add_edge({node1: {path: folder1 }, node2: {path: folder2}})
    }
  });

  for (const file of nextLevel) {
    checkFile(file);
  }
}

export function getImportsForFile(file: string) {
  const fileInfo = ts.preProcessFile(readFileSync(file).toString());
  return fileInfo.importedFiles
    .map((importedFile: FileReference) => importedFile.fileName)
    // .filter((fileName: string) => /^json/.test(fileName)) // remove json imports
    .filter((x: string) => !x.endsWith(".json")) // ignore json
    .filter((x: string) => !x.endsWith(".js")) // ignore js
    .filter((x: string) => x.startsWith(".")) // only relative paths allowed
    .map((fileName: string) => {
      return join(dirname(file), fileName);
    })
    .map((fileName: string) => {
      if (existsSync(`${fileName}.ts`)) {
        return `${fileName}.ts`;
      }
      if (existsSync(`${fileName}.js`)) {
        return `${fileName}.js`;
      }
      if (existsSync(`${fileName}.d.ts`)) {
        return `${fileName}.d.ts`;
      }
      const yo = join(fileName, "index.ts").normalize();
      if (existsSync(yo)) {
        return yo;
      }
      throw new Error(`Unresolved import ${fileName} in ${file}`);
    });
}
