// import * as d3 from '../vendor/d3.v7.min.js'

let tooltip

export function getTooltip() {
  if (tooltip) return tooltip

  tooltip = d3.select('body')
    .append('div')
    .attr('class', 'tooltip')
    .style('position', 'absolute')
    .style('background', 'white')
    .style('border', '1px solid #ccc')
    .style('padding', '6px 10px')
    .style('border-radius', '4px')
    .style('pointer-events', 'none')
    .style('opacity', 0)

  return tooltip
}
