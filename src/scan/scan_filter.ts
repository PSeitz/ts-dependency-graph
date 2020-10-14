import { DependencyOptions } from '..'

export const negation = 'NOT '

export type ScanFilter = ReturnType<typeof get_filter>;
export type ScanFilters = ReturnType<typeof get_filters>;

export function get_filters(options: DependencyOptions) {
    const node_filters = (options.filter || []).map(get_filter)

    const edge_filters = (options.filter_edges || []).map((filter) => {
        let [part0, part1] = filter.split('=>')
        if (part0 === undefined || part1 === undefined) {
            throw new Error('Expected filter in the format start=>end, but got ' + filter)
        }
        return {
            from: get_filter(part0),
            to: get_filter(part1),
        }
    })

    if (options.verbose_filter) {
        console.log('Parsed Edges Filters: ' + JSON.stringify(edge_filters))
        console.log('Parsed Nodes Filters: ' + JSON.stringify(node_filters))
    }

    return {
        node_filters, edge_filters
    }
}

function get_filter(filter: string) {
    let is_negated = filter.startsWith(negation)
    if (filter.startsWith(negation)) filter = filter.substr(negation.length)
    return {
        is_negated,
        filter,
    }
}

export function isFilteredByCond(filter: ScanFilter, check: string, options: DependencyOptions) {
    const val = filter.is_negated ? !check.includes(filter.filter) : check.includes(filter.filter)
    if (options.verbose_filter) {
        console.log(`isFilteredByCond ${check} ${filter.is_negated ? 'NOT ' : ''}${filter.filter}: ${val}`)
    }
    return val
}