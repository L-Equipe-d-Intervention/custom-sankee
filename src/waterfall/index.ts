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
  percent?: number
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
    show_gridlines: {
      type: 'boolean',
      label: 'Gridlines',
      default: true,
    },
    show_lines_between_blocks: {
      type: 'boolean',
      label: 'Lines between blocks',
      default: true,
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
        stroke: lightgrey;
        stroke-dasharray: 3;
        stroke-width: 1px;
      }
      
      .bar text {
        fill: white;
        font: 12px sans-serif;
        text-anchor: middle;
      }
      
      .axis text {
        font-family: Roboto, "Noto Sans", sans-serif;
        font-size: 12px;
        color: #3a4245;
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

    const margin = { top: 20, right: 30, bottom: 20, left: 40 }
    const width = element.clientWidth - margin.left - margin.right
    const height = element.clientHeight - margin.top - margin.bottom
    const padding = 0.3

    const xScale = d3.scaleBand()
      .range([0, width])
      .padding(padding)

    const yScale = d3.scaleLinear()
      .range([height, 0])

    const xAxis = d3.axisBottom(xScale)

    const yAxis = d3.axisLeft(yScale)
      .tickFormat(d => humanize(Number(d)))

    const svg = this.svg
      .html('')
      .attr('width', element.clientWidth)
      .attr('height', element.clientHeight)
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
        rendered: humanize(cumulative),
        start: 0,
        end: cumulative,
        class: 'total',
      })
    }

    xScale.domain(computedData.map(d => d.name))
    yScale.domain([
      d3.min(computedData, d => d.start || 0) || 0,
      d3.max(computedData, d => d.end || d.value) || 0,
    ])
      .interpolate(d3.interpolateRound)

    svg.append('g')
      .attr('class', 'x axis')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis)

    svg.append('g')
      .attr('class', 'y axis')
      .call(yAxis)

    if (config.show_gridlines) {
      svg.selectAll('line.horizontalGrid')
        .data(yScale.ticks())
        .join('line')
        .attr('class', 'horizontalGrid')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', (d: number) => yScale(d) + 0.5)
        .attr('y2', (d: number) => yScale(d) + 0.5)
        .attr('fill', 'none')
        .attr('stroke', 'lightgrey')
        .attr('stroke-width', '1px')
        .attr('shape-rendering', 'crispEdges')
    }

    const bar = svg.selectAll('.bar')
      .data(computedData)
      .join('g')
      .attr('class', (d: Row) => `bar ${d.class}`)
      .attr('transform', (d: Row) => `translate(${xScale(d.name)},0)`)

    bar.append('rect')
      .attr('y', (d: Row) => yScale(Math.max(d.start || 0, d.end || d.value)))
      .attr('height', (d: Row) => Math.abs(yScale(d.start || 0) - yScale(d.end || d.value)))
      .attr('width', xScale.bandwidth())

    bar.append('text')
      .attr('x', xScale.bandwidth() / 2)
      .attr('y', (d: Row) => yScale(d.end || d.value) + 5)
      .attr('dy', (d: Row) => ((d.class == 'negative') ? '-' : '') + '.75em')
      .text((d: Row) => textFormatter(d))

    if (config.show_lines_between_blocks) {
      bar.filter((d: Row) => d.class !== 'total').append('line')
        .attr('class', 'connector')
        .attr('x1', xScale.bandwidth() + 5)
        .attr('y1', (d: Row) => yScale(d.end || d.value))
        .attr('x2', xScale.bandwidth() / (1 - padding) - 5)
        .attr('y2', (d: Row) => yScale(d.end || d.value))
    }


    function textFormatter(row: Row) {
      switch (config.label_type || vis.options.label_type.default) {
        case 'value':
          return `${row.rendered}`
        case 'value_percentage':
          if (!row.percent) {
            return row.rendered
          }
          return `${row.rendered} (${(row.percent * 100).toFixed(2)}%)`
        default:
          return ''
      }

    }

    doneRendering()
  },
}
looker.plugins.visualizations.add(vis)
