import { Bar, VisConfig, VisData, VisQueryResponse } from '../types'
import * as d3 from 'd3'

const LABEL_PLACEHOLDER = '(empty)'

export function humanize(n: number, rounded = 2): string {
  n = Math.round(n)
  if (Math.abs(n) > 1000000) {
    return (n / 1000000).toFixed(2) + 'M'
  }
  if (Math.abs(n) > 1000) {
    return (n / 1000).toFixed(rounded) + ' K'
  }
  return n.toString()
}

export function textFormatter(row: Bar, label_type: string): string {
  switch (label_type) {
    case 'value_percentage':
      if (!row.percent) {
        return row.rendered.toString()
      }
      return `${row.rendered} (${(row.percent * 100).toFixed(2)}%)`
    default:
      return `${row.rendered}`
  }
}

export function computeData(data: VisData, queryResponse: VisQueryResponse, config: VisConfig): Bar[] {
  const { dimension_like, measure_like } = queryResponse.fields
  const hasNoDimensions = dimension_like.length <= 0
  const hasBaseMeasure = measure_like.length === 2
  const [baseDimension] = dimension_like
  const [baseMeasure, measure] = hasBaseMeasure ? measure_like : [undefined, measure_like[0]]
  const hasOneMeasureOnly = measure_like.length === 1
  const displayTotal = hasBaseMeasure || hasOneMeasureOnly

  const baseTotal = hasBaseMeasure ? d3.reduce(data, (cum, m) => cum + m[baseMeasure.name].value, 0) : 0
  const total = baseTotal + d3.sum(data, (d) => d[measure.name]['value'])

  // Transform data (i.e., finding cumulative values and total) for easier charting
  let cumulative = 0
  const computedData: Bar[] = []
  data.forEach((d, i, data) => {
    const barId = d[baseDimension.name].value
    if (hasNoDimensions) {
      measure_like.forEach(measure => {
        const { value } = d[measure.name]
        const bar: Bar = {
          value,
          id: barId,
          start: 0,
          end: value,
          name: measure.label_short || LABEL_PLACEHOLDER,
          rendered: rendered || humanize(value),
          color: '#dd45ff',
          tooltipLabel: measure.label,
        }
        computedData.push(bar)
      })
      return
    }

    if (hasBaseMeasure && i === 0) {
      const value = config.sum_for_baseline ? data.reduce((cum, m) => cum + m[baseMeasure.name].value, 0) : data[0][baseMeasure.name].value
      // Compute baseline measure prior to any bars
      const bar: Bar = {
        value,
        id: barId,
        name: baseMeasure.field_group_variant,
        rendered: humanize(value),
        start: 0,
        end: value,
        percent: value / total,
        tooltipLabel: baseMeasure.field_group_variant,
        color: config.baseline_color,
      }
      computedData.push(bar)
      cumulative += value
    }

    const { value, rendered } = d[measure.name]
    // Concatenating all dimensions name for the label
    const name = dimension_like.map(dimension => d[dimension.name].value).filter(Boolean).join(' - ')
    const bar: Bar = {
      value,
      id: barId,
      name: name || LABEL_PLACEHOLDER,
      rendered: rendered || humanize(value),
      start: cumulative,
      end: cumulative + value,
      percent: value / total,
      tooltipLabel: measure.field_group_variant,
    }
    computedData.push(bar)
    cumulative += value
  })

  if (displayTotal) {
    computedData.push({
      id: 'total',
      name: 'Total',
      value: cumulative,
      rendered: humanize(cumulative),
      start: 0,
      end: cumulative,
      tooltipLabel: 'Total',
      color: config.total_color,
    })
  }

  return computedData
}

export function getTooltipHtml(measureName: string, count: string) {
  return `
    <div class="title">${measureName}</div>
    <div class="count">${count}</div>
  `
}
