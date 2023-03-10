import * as d3 from 'd3'
import { handleErrors } from '../utils'
// import colors from '../colors.json'
import { Looker, VisualizationDefinition } from '../types'

// Global values provided via the API
declare const looker: Looker

interface Index extends VisualizationDefinition {
  svg?: any;
}

interface FakeRow {
  value: number
  name: string
  start?: number
  end?: number
  class?: string
}

const fakeData: FakeRow[] = [
  {
    value: 50,
    name: 'Hello',
  },
  {
    value: 150,
    name: 'world',
  },
  {
    value: -45,
    name: 'Antoine',
  },
]

const vis: Index = {
  id: 'waterfall', // id/label not required, but nice for testing and keeping manifests in sync
  label: 'Waterfall',
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
      default: 'name',
      display: 'select',
      label: 'Label Type',
      type: 'string',
      values: [
        { Name: 'name' },
        { 'Name (value)': 'name_value' },
        { 'Name: value (percentage)': 'name_value_percentage' },
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
      <svg class="chart"></svg>
    `
  },
  // Render in response to the data or settings changing
  updateAsync(data, element, config, queryResponse, _details, doneRendering) {
    if (
      !handleErrors(this, queryResponse, {
        min_pivots: 0,
        max_pivots: 0,
        min_dimensions: 2,
        max_dimensions: undefined,
        min_measures: 1,
        max_measures: 1,
      })
    )
      return

    console.log(data)
    console.log(config)
    console.log(queryResponse)

    const width = element.clientWidth
    const height = element.clientHeight

    // const svg = this.svg
    //   .html("")
    //   .attr("width", "100%")
    //   .attr("height", "100%")
    //   .append("g");

    // const dimensions = queryResponse.fields.dimension_like;
    // const measure = queryResponse.fields.measure_like[0];
    // const total = d3.sum(data, (d) => d[measure.name]["value"]);

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
    const padding = 0.3

    const xRange = d3.scaleBand().range([0, width]).padding(padding)

    const yRange = d3.scaleLinear()
      .range([height, 0])

    const xAxis = d3.axisBottom(xRange)

    const yAxis = d3.axisLeft(yRange)
      .tickFormat(function (d) {
        return dollarFormatter(Number(d))
      })

    const chart = d3.select('.chart')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')


    // Transform data (i.e., finding cumulative values and total) for easier charting
    let cumulative = 0
    for (let i = 0; i < fakeData.length; i++) {
      fakeData[i].start = cumulative
      cumulative += fakeData[i].value
      fakeData[i].end = cumulative

      fakeData[i].class = (fakeData[i].value >= 0) ? 'positive' : 'negative'
    }
    fakeData.push({
      value: cumulative,
      name: 'Total',
      start: 0,
      end: cumulative,
      class: 'total',
    })

    xRange.domain(fakeData.map(function (d) {
      return d.name
    }))
    yRange.domain([0, d3.max(fakeData, (d) => {
      return d.end
    }) || 0])

    chart.append('g')
      .attr('class', 'x axis')
      .attr('transform', 'translate(0,' + height + ')')
      .call(xAxis)

    chart.append('g')
      .attr('class', 'y axis')
      .call(yAxis)

    const bar = chart.selectAll('.bar')
      .data(fakeData)
      .enter().append('g')
      .attr('class', function (d) {
        return 'bar ' + d.class
      })
      .attr('transform', function (d) {
        return 'translate(' + xRange(d.name) + ',0)'
      })

    bar.append('rect')
      .attr('y', function (d) {
        return yRange(Math.max(d.start!, d.end!))
      })
      .attr('height', function (d) {
        return Math.abs(yRange(d.start!) - yRange(d.end!))
      })
      .attr('width', xRange.bandwidth)

    bar.append('text')
      .attr('x', xRange.bandwidth() / 2)
      .attr('y', function (d) {
        return yRange(d.end!) + 5
      })
      .attr('dy', function (d) {
        return ((d.class == 'negative') ? '-' : '') + '.75em'
      })
      .text(function (d) {
        return dollarFormatter(d.end! - d.start!)
      })

    bar.filter(function (d) {
      return d.class != 'total'
    }).append('line')
      .attr('class', 'connector')
      .attr('x1', xRange.bandwidth() + 5)
      .attr('y1', function (d) {
        return yRange(d.end!)
      })
      .attr('x2', xRange.bandwidth() / (1 - padding) - 5)
      .attr('y2', function (d) {
        return yRange(d.end!)
      })

    function dollarFormatter(n: number) {
      n = Math.round(n)
      let result = '' + n
      if (Math.abs(n) > 1000) {
        result = Math.round(n / 1000) + 'K'
      }
      return '$' + result
    }

    doneRendering()
  },
}
looker.plugins.visualizations.add(vis)
