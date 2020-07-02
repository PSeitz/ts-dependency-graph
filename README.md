[![NPM Downloads](https://img.shields.io/npm/dm/ts_dependency_graph.svg?style=flat)](https://npmjs.org/package/ts_dependency_graph)
# TS-Dependency-Graph
Prints a dependency graph in dot format for your typescript project. Supported files are .ts and .tsx

### Usage

#### Install CLI
`npm i ts_dependency_graph -g`

```
 ts_dependency_graph --help
Options:
  --help                 Show help                                     [boolean]
  --version              Show version number                           [boolean]
  --start                                                               [string]
  --aggregate_by_folder                               [boolean] [default: false]
  --max_depth                                           [number] [default: 1000]
  --verbose                                           [boolean] [default: false]
  --base_path
   [string] [default: "/currentpath"]
```

`ts_dependency_graph --start src/index.ts`

Use output with https://dreampuf.github.io/GraphvizOnline/, http://www.webgraphviz.com/, or by piping result to dot tool

![graph_example](https://raw.githubusercontent.com/PSeitz/ts_dependency_graph/master/example.png)


```
ts_dependency_graph --start src/index.ts  | dot -T svg > dependencygraph.svg
```

#### Use from Github Repo

`npx ts-node src/index.ts --help`

Usage on self
```
npx ts-node src/index.ts --start src/index.ts
```

