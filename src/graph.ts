import path from 'path'

export interface IEdge {
    node1: INode
    node2: INode
    color?: string
}
export interface INode {
    color?: string
    hotspot?: number // colorize by hotspot information
    hotspot_pos?: number // position in all nodes if sorted by hotspot
    layer?: number // colorize by layer from info.json in same folder {layer: 10}  - {layer: 100}
    path: string
    label?: string
}

function pathToName(path: string) {
    const pathToNameRegex = /([^\/\\]+)(?=\.\w+$)/
    let nameMatch: RegExpMatchArray | null = path.match(pathToNameRegex)
    let name = nameMatch ? nameMatch[0] : path
    if (name == 'graph') {
        // escape reserved word(for mermaid)
        name = 'graph_xx'
    }
    return name
}

function escapeMermaid(str: string) {
    const escapeChars = '_'
    return str.replace(/\[|\]/g, escapeChars) // escape brackets: "[", "]"
}

export function getRandomColor() {
    var letters = '0123456789ABCDEF'
    var color = '#'
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)]
    }
    return color
}

export class Graph {
    public edges: IEdge[] = []
    public nodes: INode[] = []
    public color_edges: boolean
    public start_nodes: Set<INode> = new Set()
    constructor(color_edges: boolean) {
        this.color_edges = color_edges
    }
    // get_edges() {
    //     return this.edges;
    // }
    // get_nodes() {
    //     return this.nodes;
    // }
    walk(
        start_node: INode,
        cb: (edge: IEdge, path: IEdge[]) => boolean,
        path?: IEdge[],
        visited_edges?: Set<IEdge>,
        visited_nodes?: Set<INode>
    ) {
        visited_edges = visited_edges || new Set()
        visited_nodes = visited_nodes || new Set()
        path = path || []
        const edges = this.get_edges_for_node(start_node)
        for (const edge of edges) {
            if (visited_nodes.has(edge.node2)) continue
            visited_nodes.add(edge.node2)
            if (visited_edges.has(edge)) continue
            visited_edges.add(edge)
            path.push(edge)
            const should_continue = cb(edge, path)
            if (should_continue) {
                this.walk(edge.node2, cb, path, visited_edges, visited_nodes)
            }
            visited_nodes.delete(edge.node2)
            path.pop()
        }
        return this.nodes
    }

    get_node_for_id(path: string) {
        return this.nodes.filter((el) => el.path === path)[0]
    }

    get_edges_for_node(node: INode) {
        return this.edges.filter((el) => el.node1 === node || el.node2 === node)
    }
    get_incoming_edges_for_node(node: INode) {
        return this.edges.filter((el) => el.node2 === node)
    }
    get_outgoing_edges_for_node(node: INode) {
        return this.edges.filter((el) => el.node1 === node)
    }

    add_node(node: INode) {
        const exisiting_node = this.get_node_for_id(node.path)
        if (exisiting_node) {
            return exisiting_node
        }
        this.nodes.push(node)
        return node
    }

    to_dot(root_node?: string, graph_folder?: boolean) {
        let relcnt = 1

        function colorToNode(color?: string) {
            if (!color) return
            return `, fillcolor=${color} style=filled `
        }

        let paths = this.nodes.map((n) => n.path.split('/'))
        paths.sort()

        let folder_subgraphs = ''
        if (graph_folder) {
            let tree = get_folder_as_tree(this.nodes)
            folder_subgraphs = tree_to_subgraph(tree, { cluster_number: 1 }, '')
        }

        const nodes = this.nodes
            .map((n) => {
                if (n.path === root_node && !n.color) n.color = 'orange'
                if (n.hotspot_pos && !n.color) n.color = 'green'
                let fillcolor = colorToNode(n.color) ?? ''

                // if(n.path !== root_node && n.layer){
                //     color = `, color="#${n.layer.toString(16)}0000"`;
                // }
                let label = n.path
                if (graph_folder) {
                    let path_components = n.path.split('/')
                    label = path_components[path_components.length - 1]
                }

                return `"${n.path}" [shape=record ${fillcolor} label="${label}"]`
            })
            .join('\n    ')

        function add_edges_to_dot(edges: IEdge[], directed: boolean, color_edges: boolean) {
            if (edges.length !== 0) {
                // const edges_str = edges.map(e => {
                //     return `"${escape(e.node1.path)}" -> "${escape(e.node2.path)}" `;
                // }).join("\n        ");
                const edges_str = edges
                    .map((e) => {
                        if (color_edges) {
                            e.node1.color = e.node1.color || e.color || getRandomColor()
                            e.color = e.color || e.node1.color
                        }

                        const color = e.color ? `[color = "${e.color}"]` : ''
                        return `"${e.node1.path}" -> "${e.node2.path}" ${color}`
                    })
                    .join('\n        ')
                const options = directed ? '' : 'edge [dir=none]'

                return `    subgraph Rel${relcnt++} {
        ${options}
        ${edges_str}
    }\n`
            }
            return ''
        }

        const directed_edges = this.edges
        const graph1 = add_edges_to_dot(directed_edges, true, this.color_edges)

        return `digraph graphname
{
    ${nodes}
${graph1}
${folder_subgraphs}
}
    `
    }

    to_mermaid(root_node?: string, graph_folder?: boolean) {
        const tab = '   '

        function add_edges_to_dot(edges: IEdge[], directed: boolean, color_edges: boolean) {
            if (edges.length !== 0) {
                const dirChar = directed ? '' : '<'
                const edges_str = edges
                    .map((e) => {
                        const name1 = escapeMermaid(pathToName(e.node1.path))
                        const name2 = escapeMermaid(pathToName(e.node2.path))
                        return `${name1} ${dirChar}--> ${name2}`
                    })
                    .join(`\n${tab}${tab}${tab}`)

                return `${tab}class app myClass${relcnt++}\n${tab}${tab}${tab}${edges_str}\n`
            }
            return ''
        }

        let relcnt = 1
        let paths = this.nodes.map((n) => n.path.split('/'))
        paths.sort()

        let folder_subgraphs = ''
        if (graph_folder) {
            let tree = get_folder_as_tree(this.nodes)
            folder_subgraphs = tree_to_subgraph_mermaid(tree, { cluster_number: 1 }, tab)
        }

        const nodes = this.nodes
            .map((n) => {
                const path = escapeMermaid(n.path)
                const name = escapeMermaid(pathToName(path))
                return `${name}[${path}]`
            })
            .join(`\n${tab}`)

        const directed_edges = this.edges
        const graph1 = add_edges_to_dot(directed_edges, true, this.color_edges)

        return `graph TD\n${tab}${nodes}\n${graph1}\n${folder_subgraphs}\n${folder_subgraphs}`
    }

    add_edge(edge: IEdge) {
        edge.node1 = this.add_node(edge.node1)
        edge.node2 = this.add_node(edge.node2)
        if (!this.edges.find((el) => el.node1 == edge.node1 && el.node2 == edge.node2)) {
            this.edges.push(edge)
        }
        return edge
    }
}

export interface IPathTree {
    sub_folders: { [key: string]: IPathTree }
    files_in_folder: string[]
}

function get_folder_as_tree(nodes: INode[]): IPathTree {
    let root = {
        sub_folders: {},
        files_in_folder: [],
    }

    let paths = nodes.map((n) => [n.path.split('/'), n.path] as const)
    paths.sort()
    for (let el of paths) {
        let path = el[0]
        let full_path = el[1]
        put_folder_in_tree(path, full_path, root)
    }
    return root
}

function tree_to_subgraph(tree: IPathTree, number: { cluster_number: number }, intendation: string): string {
    intendation = intendation + '    '
    return Object.keys(tree.sub_folders)
        .map((folder_name) => {
            let folder = tree.sub_folders[folder_name]
            let files = folder.files_in_folder.map((file) => `\n        ${intendation}"${file}";`).join('')

            let current_number = number.cluster_number
            number.cluster_number = number.cluster_number + 1
            let sub_cluster = tree_to_subgraph(folder, number, intendation)

            return `
    ${intendation}subgraph cluster_${current_number}{
        ${intendation}label = "${folder_name}";
        ${files}
        ${sub_cluster}
    ${intendation}}
`
        })
        .join('\n')
}
function tree_to_subgraph_mermaid(
    tree: IPathTree,
    number: { cluster_number: number },
    intendation: string = '  '
): string {
    const selfIntend = intendation
    return Object.keys(tree.sub_folders)
        .map((folder_name) => {
            let folder = tree.sub_folders[folder_name]
            let files = folder.files_in_folder
                .map((file) => `${intendation}${selfIntend}${pathToName(file)}\n`)
                .join('')

            let current_number = number.cluster_number
            number.cluster_number = number.cluster_number + 1
            let sub_cluster = tree_to_subgraph_mermaid(folder, number, intendation + selfIntend)
            const folder_name_escaped = escapeMermaid(folder_name)
            const files_escaped = escapeMermaid(files)
            return `${intendation}subgraph cluster_${current_number} ${folder_name_escaped}\n${files_escaped}${sub_cluster}${intendation}end\n`
        })
        .join('\n')
}

// full_path acts as an identifier to the node
function put_folder_in_tree(paths: string[], full_path: string, tree: IPathTree) {
    if (paths.length == 1) {
        tree.files_in_folder = tree.files_in_folder || []
        tree.files_in_folder.push(full_path)
        return
    }
    let next = paths.shift()!
    tree.sub_folders[next] = tree.sub_folders[next] || {
        files_in_folder: [],
        sub_folders: {},
    }

    put_folder_in_tree(paths, full_path, tree.sub_folders[next])
}
