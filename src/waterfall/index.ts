import * as d3 from 'd3'
import { handleErrors } from '../utils'
// import colors from '../colors.json'
import { Cell, Looker, VisualizationDefinition } from '../types'

// Global values provided via the API
declare const looker: Looker

interface Index extends VisualizationDefinition {
  svg?: any;
}

interface Row {
  name: string
  value: number
  percent: number
  rendered: string | Cell
  start?: number
  end?: number
  class: string
}

function humanize(n: number): string {
  n = Math.round(n)
  let result = '' + n
  if (Math.abs(n) > 1000) {
    result = Math.round(n / 1000) + ' K'
  }
  return result
}

const vis: Index = {
  id: 'custom_waterfall', // id/label not required, but nice for testing and keeping manifests in sync
  label: 'mROI Waterfall',
  options: {
    color_range: {
      type: 'array',
      label: 'Color Range',
      display: 'colors',
      default: [
        '#dd3333',
        '#80ce5d',
        '#f78131',
        '#369dc1',
        '#c572d3',
        '#36c1b3',
        '#b57052',
        '#ed69af',
      ],
    },
    label_type: {
      default: 'value',
      display: 'select',
      label: 'Label Type',
      type: 'string',
      values: [
        { 'Value': 'value' },
        { 'Value (percentage)': 'value_percentage' },
      ],
    },
    show_null_points: {
      type: 'boolean',
      label: 'Plot Null Values',
      default: true,
    },
  },
  // Set up the initial state of the visualization
  create(element) {
    element.innerHTML = `
      <style>
      .bar.total rect {
        fill: steelblue;
      }
      
      .bar.positive rect {
        fill: darkolivegreen;
      }
      .bar.negative rect {
        fill: crimson;
      }
      
      .bar line.connector {
        stroke: grey;
        stroke-dasharray: 3;
      }
      
      .bar text {
        fill: white;
        font: 12px sans-serif;
        text-anchor: middle;
      }
      
      .axis text {
        font: 10px sans-serif;
      }
      
      .axis path,
      .axis line {
        fill: none;
        stroke: #000;
        shape-rendering: crispEdges;
      }
      </style>
    `
    this.svg = d3.select(element).append('svg')
  },
  // Render in response to the data or settings changing
  updateAsync(data, element, config, queryResponse, _details, doneRendering) {
    const { dimensions } = config.query_fields
    const max_measures = dimensions.length > 0 ? 1 : undefined

    if (
      !handleErrors(this, queryResponse, {
        min_pivots: 0,
        max_pivots: 0,
        min_dimensions: 0,
        min_measures: 1,
        max_measures,
      })
    ) {
      return
    }

    //  The standard d3.ScaleOrdinal<string, {}>, causes error
    // `no-inferred-empty-object-type  Explicit type parameter needs to be provided to the function call`
    // https://stackoverflow.com/questions/31564730/typescript-with-d3js-with-definitlytyped
    // const color = d3
    //   .scaleOrdinal<string, string>()
    //   .range(config.color_range || vis.options.color_range.default);

    // const getColorFromSankeyNode = (node: { depth: number; name: string }) => {
    //   if (dimensions.length > node.depth) {
    //     const dimensionKey = dimensions[node.depth].name as keyof typeof colors;
    //     const dimensionColors = colors[dimensionKey];
    //     const dimensionValue = node.name as keyof typeof dimensionColors;
    //     if (colors[dimensionKey] && colors[dimensionKey][dimensionValue]) {
    //       return colors[dimensionKey][dimensionValue];
    //     }
    //   }
    //   return color(node.name);
    // };

    const margin = { top: 20, right: 30, bottom: 30, left: 40 }
    const width = element.clientWidth - margin.left - margin.right
    const height = element.clientHeight - margin.top - margin.bottom
    const padding = 0.3

    const x = d3.scaleBand()
      .range([0, width])
      .padding(padding)

    const y = d3.scaleLinear()
      .range([height, 0])

    const xAxis = d3.axisBottom(x)

    const yAxis = d3.axisLeft(y)
      .tickFormat(d => humanize(Number(d)))

    const svg = this.svg
      .html('')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)


    // 0 dimension + X measures
    console.log('data', data)
    console.log('config', config)
    console.log('fields', queryResponse.fields)
    const { dimension_like } = queryResponse.fields
    const { measure_like } = queryResponse.fields
    const [measure] = measure_like
    const noDimensions = dimension_like.length <= 0
    const oneMeasureOnly = measure_like.length === 1
    const total = d3.sum(data, (d) => d[measure.name]['value'])

    // Transform data (i.e., finding cumulative values and total) for easier charting
    let cumulative = 0
    const computedData: Row[] = []
    data.forEach(d => {
      if (noDimensions) {
        measure_like.forEach(measure => {
          const { value } = d[measure.name]
          const block = {
            value,
            name: measure.label_short,
            percent: 1,
            rendered: rendered || humanize(value),
            class: value >= 0 ? 'positive' : 'negative',
          }
          computedData.push(block)
        })
        return
      }

      const { value, rendered } = d[measure.name]
      const name = dimension_like.map(dimension => d[dimension.name].value).filter(Boolean).join(' - ')
      const block = {
        name,
        value,
        rendered: rendered || humanize(value),
        start: cumulative,
        end: cumulative + value,
        percent: value / total,
        class: value >= 0 ? 'positive' : 'negative',
      }
      cumulative += value

      computedData.push(block)
    })

    if (oneMeasureOnly) {
      computedData.push({
        name: 'Total',
        value: cumulative,
        percent: 1,
        rendered: humanize(cumulative),
        start: 0,
        end: cumulative,
        class: 'total',
      })
    }

    x.domain(computedData.map(d => d.name))
    y.domain([
      d3.min(computedData, d => d.start || 0) || 0,
      d3.max(computedData, d => d.end || d.value) || 0,
    ])

    svg.append('g')
      .attr('class', 'x axis')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis)

    svg.append('g')
      .attr('class', 'y axis')
      .call(yAxis)

    const bar = svg.selectAll('.bar')
      .data(computedData)
      .join('g')
      .attr('class', (d: Row) => `bar ${d.class}`)
      .attr('transform', (d: Row) => `translate(${x(d.name)},0)`)

    bar.append('rect')
      .attr('y', (d: Row) => y(Math.max(d.start || 0, d.end || d.value)))
      .attr('height', (d: Row) => Math.abs(y(d.start || 0) - y(d.end || d.value)))
      .attr('width', x.bandwidth())

    bar.append('text')
      .attr('x', x.bandwidth() / 2)
      .attr('y', (d: Row) => y(d.end || d.value) + 5)
      .attr('dy', (d: Row) => ((d.class == 'negative') ? '-' : '') + '.75em')
      .text((d: Row) => textFormatter(d))

    bar.filter((d: Row) => d.class !== 'total').append('line')
      .attr('class', 'connector')
      .attr('x1', x.bandwidth() + 5)
      .attr('y1', (d: Row) => y(d.end || d.value))
      .attr('x2', x.bandwidth() / (1 - padding) - 5)
      .attr('y2', (d: Row) => y(d.end || d.value))


    function textFormatter(row: Row) {
      switch (config.label_type || vis.options.label_type.default) {
        case 'value':
          return `${row.rendered}`
        case 'value_percentage':
          return `${row.rendered} (${(row.percent * 100).toFixed(2)}%)`
        default:
          return ''
      }

    }

    doneRendering()
  },
}
looker.plugins.visualizations.add(vis)
