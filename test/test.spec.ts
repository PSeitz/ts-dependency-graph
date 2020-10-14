import { Graph } from '../src/graph'
import type {  DependencyOptions } from '../src'
import { get_dot, get_graph } from '../src/lib'

describe('graph', function () {
    it('show_path_to', async function () {


        const options: DependencyOptions = {
            start: "test_project/start.ts",
            base_path: "",
            show_path_to: "test_project/leaf.ts"
        }
        const g = get_graph(options)
        let dot = get_dot(g, options)

        // console.log(dot)

        expect(dot).not.toContain("midleaf")
    })
    it('aggreagte_by_folder', async function () {


        const options: DependencyOptions = {
            start: "test_project/start.ts",
            base_path: "",
            aggregate_by_folder: true
        }
        const g = get_graph(options)
        let dot = get_dot(g, options)

        console.log(dot)

        // expect(dot).not.toContain("midleaf")
    })
})

