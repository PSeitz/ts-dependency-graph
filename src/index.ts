#!/usr/bin/env node
import glob from "glob";
import ts, { FileReference } from "typescript";
import { Graph } from "./graph";
import { readFileSync, existsSync, lstatSync } from "fs";
import { dirname, join, relative, extname, normalize } from "path";
import { promisify } from "util";
import * as yargs from "yargs";

const globProm = promisify(glob);

const g = new Graph();
const g_folders = new Graph();
const checkedFiles = new Set();
const ignoredFiles = new Set<string>();

type PathObj = ReturnType<typeof convertPath>;

const cache: { [index: string]: PathObj[] } = {}
export function getCachedImportsForFile(file: string) {
  if (!cache[file]) {
    cache[file] = getImportsForFile(file);
  }
  return cache[file];
}

const negation = "NOT "

const argv = yargs.options({
  // target: { type: 'string', describe: "the target file, to see which dependencies are depending on the file. This is an inverse of start. choose either" },
  start: { type: 'string', describe: "the starting file, for the analysis. can also be an folder" },
  aggregate_by_folder: { type: 'boolean', default:false, describe: "create graph on folder level", alias: 'agg'  },
  max_depth: { type: 'number', default:1000 },
  filter: { type: 'array', describe: `removes files containing the provided strings. Can be negated with - in front, to remove files not containing the filter. e.g. '${negation}module1' - everything not containing module1.ts will be filtered. `, default:[] as string[] },
  filter_edges: { type: 'array', describe: `removes edges containing the provided strings, the format is start_file=>target_file. The edges containing start_file AND target_file are filtered. Start and target can be negated with '${negation}' in front . (Currently) This is not just a postprocess on the graph. The edges won't be followed. Note: put in quotes.`, default:[] as string[] },
  verbose: { type: 'boolean', default:false, describe: "prints information about ignored files", alias: 'v' },
  verbose_filter: { type: 'boolean', default:false, describe: "prints information about filtered files and edges" },
  hotspots: { type: 'boolean', default:false, describe: "identify hotspots, by analyzing number of incoming and outgoing edges", alias: 'h' },
  base_path: { type: 'string', default: process.cwd(), describe: "calculates path relatives to the base path" },
}).argv;

// export async function start(start_path: string) {
//   const all_files = await getSrcFiles(start_path);
//   all_files.forEach(f => checkFile(f))
//   console.log(g.to_dot())
// }

function get_filter(filter: string){
  let is_negated = filter.startsWith(negation);
  if(filter.startsWith(negation)) filter = filter.substr(negation.length);
  return {
    is_negated,
    filter
  }
}

const node_filters = argv.filter.map(get_filter);


const edge_filters = argv.filter_edges.map(filter => {
  let [part0, part1] = filter.split("=>");
  if(part0 === undefined || part1 === undefined){
    throw new Error("Expected filter in the format start=>end, but got " + filter);
  }
  return{
    from: get_filter(part0),
    to: get_filter(part1),
  }
})

if(argv.verbose_filter){
  console.log("Parsed Edges Filters: " + JSON.stringify(edge_filters))
  console.log("Parsed Nodes Filters: " + JSON.stringify(node_filters))
}

let start_filo = argv.start;
let base_path = argv.base_path;


function calculate_hotspots(g: Graph, num_hotspots: number){
  let nodes = g.get_nodes();
  for (const node of nodes) {
    let in_len= g.get_incoming_edges_for_node(node).length;
    let out_len= g.get_outgoing_edges_for_node(node).length;
    node.hotspot = in_len * out_len * out_len;
  }
  let sortedbyhotspot = nodes.sort((a, b) => (b.hotspot || 0) - (a.hotspot|| 0));
  for (let index = 0; index < num_hotspots; index++) {
    sortedbyhotspot[index].hotspot_pos = index+1;
  }
}

function print_result(start_file: string){

  if(argv.hotspots){
    calculate_hotspots(g, Math.min(5, g.get_nodes().length / 2));
    calculate_hotspots(g_folders, Math.min(5, g_folders.get_nodes().length / 2));
  }

  if(argv.verbose){
    console.log("Ignored Files: " + ignoredFiles.size)
    console.log([...ignoredFiles].join(", "))
  }

  if(argv.aggregate_by_folder){
    console.log(g_folders.to_dot(dirname(relative(base_path, start_file))))
  }else{
    console.log(g.to_dot(relative(base_path, start_file)))
  }

}


export async function start_scan(start_file: string) {

  if(lstatSync(start_file).isDirectory()){
    let files = await getSrcFiles(start_file);
    for (const file of files) {
      checkFile(convertPath(file), 0);  
    }
  }else{
    checkFile(convertPath(start_file), 0)
  }

  print_result(start_file);
}
void start_scan(start_filo!);

export function isFilteredByCond(filter: ReturnType<typeof get_filter>, check:string) {
  const val =  filter.is_negated ? !check.includes(filter.filter): check.includes(filter.filter)
  if(argv.verbose_filter){
    console.log(`isFilteredByCond ${check} ${filter.is_negated?"NOT ": ""}${filter.filter}: ${val}`);
  }
  return val;
}
export async function getSrcFiles(srcRoot: string) {
  const files = await globProm(`${srcRoot}/**/*.ts`);
  return files
    .filter(file => !file.endsWith(".d.ts"))
}

function checkFile(fileName: PathObj, level: number) {
  const imports = getCachedImportsForFile(fileName.orig_path)
  let info = getInfo(fileName.orig_path);
  const nextLevel: PathObj[] = [];
  imports.forEach(importFile => {
    for (const filter of node_filters) {
      if (isFilteredByCond(filter, importFile.normalized_path))
        return;
    }
    for (const filter of edge_filters) {

      if (isFilteredByCond(filter.from, fileName.normalized_path) && isFilteredByCond(filter.to, importFile.normalized_path) ){
        if(argv.verbose_filter) console.log(`[Filters]: Filtering edge: ${fileName.normalized_path} ${isFilteredByCond(filter.from, fileName.normalized_path)} -> ${importFile.normalized_path} ${isFilteredByCond(filter.to, importFile.normalized_path)} `)
        return;
      }else{
        if(argv.verbose_filter) console.log(`[Filters]: Keeping edge: ${fileName.normalized_path} ${isFilteredByCond(filter.from, fileName.normalized_path)} -> ${importFile.normalized_path} ${isFilteredByCond(filter.to, importFile.normalized_path)} `)
      }

    }

    let importFileInfo = getInfo(importFile.orig_path);
    if(!checkedFiles.has(importFile)){
      checkedFiles.add(importFile);
      nextLevel.push(importFile);
    }
    g.add_edge({node1: {path: relative(base_path, fileName.normalized_path), layer: info.layer}, node2: {path: relative(base_path, importFile.normalized_path), layer: importFileInfo.layer}});

    let folder1 = dirname(relative(base_path, fileName.orig_path));
    let folder2 = dirname(relative(base_path, importFile.orig_path));

    if(folder1 !== folder2){
      g_folders.add_edge({node1: {path: toPosixPath(folder1), layer: info.layer }, node2: {path: toPosixPath(folder2), layer: importFileInfo.layer}})
    }
  });

  if(level + 1 === argv.max_depth){
    if(argv.verbose){
      console.log("Reached max_depth of " + argv.max_depth + " at "+ fileName);
    }
    return;
  }
  for (const file of nextLevel) {
    checkFile(file, level+1);
  }
}

function getInfo(fileName: string): { layer: number; area: string } {
  const getPath = () => join(parent_dir, "info.json")

  let parent_dir = dirname(fileName);
  let i = 0;
  while (!existsSync(getPath())) {
    parent_dir = join(parent_dir, "../");
    i++;
    if (i === 10) { break };
  }

  if (existsSync(getPath())) {
    const file = readFileSync(getPath(), "utf8");
    return JSON.parse(file);
  }

  return { layer: 1000, area: "universe" }
}

export function getImportsForFile(file: string) {
  
  const fileInfo = ts.preProcessFile(readFileSync(file).toString());
  if(argv.verbose) console.log("getImportsForFile " + file + ": " +fileInfo.importedFiles.map(el =>el.fileName).join(", "));
  return fileInfo.importedFiles
    .map((importedFile: FileReference) => importedFile.fileName)
    .filter((x: string) => x.startsWith(".")) // only relative paths allowed
    .map((fileName: string) => {
      return join(dirname(file), fileName);
    })
    .map((fileName: string) => {
      if (existsSync(`${fileName}.ts`)) {
        return `${fileName}.ts`;
      }
      if (existsSync(`${fileName}.tsx`)) {
        return `${fileName}.tsx`;
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
      ignoredFiles.add(fileName)
      return undefined;
      // throw new Error(`Unresolved import ${fileName} in ${file}`);
    })
    .filter(isDefined)
    .map(convertPath);
}

export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}


function convertPath(el:string){
  return {
    orig_path: el,
    normalized_path: toPosixPath(el)
  }
}

function toPosixPath(windowsPath:string){
  return windowsPath.replace(/^\\\\\?\\/,"").replace(/\\/g,'\/').replace(/\/\/+/g,'\/')
}
