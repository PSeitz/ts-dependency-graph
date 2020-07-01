# ts-dependency-graph
prints a dependency graph in dot format for your typescript project


### Usage

#### Install CLI
`npm i ts_dependency_graph -g`

`ts_dependency_graph --start src/index.ts`

Create svg, by piping result to dot tool

```
ts_dependency_graph --start src/index.ts --aggregate_by_folder false  | dot -T svg > dependencygraph.svg
```

#### Use from Github Repo

`npx ts-node src/index.ts --help`

Usage on self
```
npx ts-node src/index.ts --start src/index.ts --aggregate_by_folder false
```

