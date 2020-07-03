export interface IEdge {
    node1: INode;
    node2: INode;
}
export interface INode {
    hotspot?: number; // colorize by hotspot information
    hotspot_pos?: number; // position in all nodes if sorted by hotspot
    layer?: number; // colorize by layer from info.json in same folder {layer: 10}  - {layer: 100}
    path: string;
}

export class Graph {
    private edges: IEdge[] = [];
    private nodes: INode[] = [];
    get_edges() {
        return this.edges;
    }
    get_nodes() {
        return this.nodes;
    }

    get_node_for_id(path: string) {
        return this.nodes
            .filter(el => el.path === path)[0];
    }

    get_edges_for_node(node: INode) {
        return this.edges
            .filter(el => el.node1 === node || el.node2 === node);
    }
    get_incoming_edges_for_node(node: INode) {
        return this.edges
            .filter(el => el.node2 === node);
    }
    get_outgoing_edges_for_node(node: INode) {
        return this.edges
            .filter(el => el.node1 === node);
    }

    add_node(node: INode) {
        const exisiting_node = this.get_node_for_id(node.path);
        if (exisiting_node) {
            return exisiting_node;
        }
        this.nodes.push(node);
        return node;
    }

    to_dot(root_table?: string) {
        function escape(text: string) {
            return text.replace(new RegExp("/", "g"), "_");
        }

        let relcnt = 1;

        const nodes = this.nodes
            .map(n => {
                let fillcolor = n.hotspot_pos ? " fillcolor=green style=filled " : "";
                let color = n.path === root_table ? ", fillcolor=orange style=filled " : "";

                // if(n.path !== root_table && n.layer){
                //     color = `, color="#${n.layer.toString(16)}0000"`;
                // }

                const node_labels = [n.path];

                let label = "";
                // if (node_labels.length) {
                //     label = "|{" + node_labels.join("|") + "}";
                // }

                return `"${n.path}" [shape=record ${fillcolor} ${color} label="${n.path}${label}"]`;

            }).join("\n    ");

        function add_edges_to_dot(edges: IEdge[], directed: boolean = true) {
            if (edges.length !== 0) {
                // const edges_str = edges.map(e => {
                //     return `"${escape(e.node1.path)}" -> "${escape(e.node2.path)}" `;
                // }).join("\n        ");
                const edges_str = edges.map(e => {
                    return `"${e.node1.path}" -> "${e.node2.path}" `;
                }).join("\n        ");
                const options = directed ? "" : "edge [dir=none]";

                return `    subgraph Rel${relcnt++} {
        ${options}
        ${edges_str}
    }\n`;
            }
            return "";
        }

        const directed_edges = this.edges;
        const graph1 = add_edges_to_dot(directed_edges, true);

        return `digraph graphname
{
    ${nodes}
${graph1}
}
    `;
    }

    add_edge(edge: IEdge) {
        edge.node1 = this.add_node(edge.node1);
        edge.node2 = this.add_node(edge.node2);
        if(!this.edges.find(el => el.node1 == edge.node1 && el.node2 == edge.node2)){
            this.edges.push(edge);
        }
    }

}
