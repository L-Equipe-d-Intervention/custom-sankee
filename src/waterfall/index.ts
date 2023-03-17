import * as d3 from 'd3'
import { handleErrors } from '../utils'
// import colors from '../colors.json'
import { Cell, Looker, VisualizationDefinition } from '../types'

// Global values provided via the API
declare const looker: Looker

interface Index extends VisualizationDefinition {
  svg?: any;
  tooltip?: any
}

interface Row {
  name: string
  value: number
  percent?: number
  rendered: string | Cell
  start?: number
  end?: number
  tooltipLabel: string
  class: string
}

const LABEL_PLACEHOLDER = '(empty)'

function humanize(n: number, rounded = 2): string {
  n = Math.round(n)
  if (Math.abs(n) > 1000000) {
    return (n / 1000000).toFixed(2) + 'M'
  }
  if (Math.abs(n) > 1000) {
    return (n / 1000).toFixed(rounded) + ' K'
  }
  return n.toString()
}

function getTooltipHtml(measureName: string, count: string) {
  return `
    <div class="title">${measureName}</div>
    <div class="count">${count}</div>
  `
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
    value_labels: {
      type: 'boolean',
      label: 'Value Labels',
      default: true,
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
      .bar rect {
        fill: #b7b4b4;
      }
      
      .bar.total rect {
        fill: steelblue;
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
      
      .axis.x text {
        /*transform: rotateZ(-45deg);*/
        /*transform-origin: 100% 12px;*/
        /*z-index: 9999;*/
      } 
      
      .tooltip {
        font-family: "Roboto", "Noto Sans", sans-serif;
        font-size: 0.75rem;
        position: absolute;
        z-index: 10;
        background-color: #333;
        border: none;
        border-radius: 5px;
        padding: 12px;
        text-align: left;
        color: white;
      }
      
      .tooltip .title {
        font-weight: 800;
      }
      </style>
    `
    this.svg = d3.select(element).append('svg')
    this.tooltip = d3.select(element).append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0)
      .style('visibility', 'hidden')
      .text('a simple tooltip')
  },
  // Render in response to the data or settings changing
  updateAsync(data, element, config, queryResponse, _details, doneRendering) {
    const { dimensions } = config.query_fields
    const max_measures = dimensions.length > 0 ? 2 : undefined

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
      .tickSizeOuter(0)
      .tickSizeInner(0)

    const yAxis = d3.axisLeft(yScale)
      .ticks(6)
      .tickFormat(d => humanize(Number(d), 0))
      .tickSizeOuter(0)
      .tickSizeInner(0)

    const body = this.svg
      .html('')
      .attr('width', element.clientWidth)
      .attr('height', element.clientHeight)
      .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    console.log('data', data)
    console.log('config', config)
    console.log('fields', queryResponse.fields)
    const { dimension_like } = queryResponse.fields
    const { measure_like } = queryResponse.fields
    const hasBaseMeasure = measure_like.length === 2
    const [baseMeasure, measure] = hasBaseMeasure ? measure_like : [undefined, measure_like[0]]
    console.log('base measure', baseMeasure)
    console.log('measure', measure)
    const hasNoDimensions = dimension_like.length <= 0
    const hasOneMeasureOnly = measure_like.length === 1
    const baseTotal = hasBaseMeasure ? data.reduce((cum, m) => cum + m[baseMeasure.name].value, 0) : 0
    const total = baseTotal + d3.sum(data, (d) => d[measure.name]['value'])

    // Transform data (i.e., finding cumulative values and total) for easier charting
    let cumulative = 0
    const computedData: Row[] = []
    data.forEach((d, i, data) => {
      if (hasNoDimensions) {
        measure_like.forEach(measure => {
          const { value } = d[measure.name]
          const block = {
            value,
            name: measure.label_short || LABEL_PLACEHOLDER,
            rendered: rendered || humanize(value),
            class: value >= 0 ? 'positive' : 'negative',
            tooltipLabel: measure.label,
          }
          computedData.push(block)
        })
        return
      }

      if (hasBaseMeasure && i === 0) {
        const value = data.reduce((cum, m) => cum + m[baseMeasure.name].value, 0)
        // Compute base measure prior to waterfall
        const block = {
          value,
          name: baseMeasure.field_group_variant,
          rendered: humanize(value),
          start: 0,
          end: value,
          percent: value / total,
          tooltipLabel: baseMeasure.field_group_variant,
          class: 'positive'
        }
        computedData.push(block)
        cumulative += value
      }

      const { value, rendered } = d[measure.name]
      const name = dimension_like.map(dimension => d[dimension.name].value).filter(Boolean).join(' - ')
      const block = {
        name: name || LABEL_PLACEHOLDER,
        value,
        rendered: rendered || humanize(value),
        start: cumulative,
        end: cumulative + value,
        percent: value / total,
        tooltipLabel: measure.field_group_variant,
        class: value >= 0 ? 'positive' : 'negative',
      }
      cumulative += value

      computedData.push(block)
    })

    if (hasOneMeasureOnly) {
      computedData.push({
        name: 'Total',
        value: cumulative,
        rendered: humanize(cumulative),
        start: 0,
        end: cumulative,
        tooltipLabel: 'Total',
        class: 'total',
      })
    }

    const min = d3.min(computedData, d => d.start || 0) || 0
    const max = d3.max(computedData, d => d.end || d.value) || 0

    xScale.domain(computedData.map(d => d.name))
    yScale.domain([min, max]).interpolate(d3.interpolateRound)

    body.append('g')
      .attr('class', 'x axis')
      .attr('transform', `translate(0,${height + 5})`)
      .call(xAxis)
      .select('.domain')
      .attr('stroke-width', 0)

    body.append('g')
      .attr('class', 'y axis')
      .style('transform', 'translateX(-10px)')
      .call(yAxis)
      .select('.domain')
      .attr('stroke-width', 0)

    //.transition().duration(500).call(this.yAxis)

    if (config.show_gridlines) {
      body.selectAll('line.horizontalGrid')
        .data(yScale.ticks(6))
        .join('line')
        .attr('class', 'horizontalGrid')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', (d: number) => yScale(d) + 0.5)
        .attr('y2', (d: number) => yScale(d) + 0.5)
        .attr('fill', 'none')
        .attr('stroke', '#E6E6E6')
        .attr('stroke-width', '1px')
        .attr('shape-rendering', 'crispEdges')
    }

    const bar = body.selectAll('.bar')
      .data(computedData)
      .join('g')
      .attr('class', (d: Row) => `bar ${d.class}`)
      .attr('transform', (d: Row) => `translate(${xScale(d.name)},0)`)

    bar.append('rect')
      .attr('y', (d: Row) => yScale(Math.max(d.start || 0, d.end || d.value)))
      .attr('height', (d: Row) => Math.abs(yScale(d.start || 0) - yScale(d.end || d.value)))
      .attr('width', xScale.bandwidth())

    // LABELS
    if (config.value_labels) {
      bar.append('text')
        .attr('x', xScale.bandwidth() / 2)
        .attr('y', (d: Row) => yScale(d.end || d.value) + 5)
        .attr('dy', (d: Row) => ((d.class == 'negative') ? '-' : '') + '.75em')
        .text((d: Row) => textFormatter(d))
    }

    // TOOLTIP
    const mouseover = (event: MouseEvent, d: Row) => {
      this.tooltip.transition()
        .duration(200)
        .style('opacity', 1)
        .style('visibility', 'visible')
      this.tooltip.html(`${getTooltipHtml(d.tooltipLabel, textFormatter(d))}`)
        .style('left', `${event.pageX + 10}px`)
        .style('top', `${event.pageY + 10}px`)
    }

    const mousemove = (event: MouseEvent) => {
      this.tooltip
        .style('left', `${event.pageX + 10}px`)
        .style('top', `${event.pageY + 10}px`)
    }

    const mouseleave = () => {
      this.tooltip.transition()
        .duration(200)
        .style('opacity', 0)
        .style('visibility', 'hidden')
    }

    bar
      .on('mouseover', mouseover)
      .on('mousemove', mousemove)
      .on('mouseleave', mouseleave)

    // IN-BETWEEN BLOCK LINES
    if (config.show_lines_between_blocks) {
      bar.filter((d: Row) => d.class !== 'total').append('line')
        .attr('class', 'connector')
        .attr('x1', xScale.bandwidth() + 5)
        .attr('y1', (d: Row) => yScale(d.end || d.value))
        .attr('x2', xScale.bandwidth() / (1 - padding) - 5)
        .attr('y2', (d: Row) => yScale(d.end || d.value))
    }

    function textFormatter(row: Row): string {
      switch (config.label_type || vis.options.label_type.default) {
        case 'value':
          return `${row.rendered}`
        case 'value_percentage':
          if (!row.percent) {
            return row.rendered.toString()
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
