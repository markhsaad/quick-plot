// Scatter plot type — markers only, no connecting line. See js/plot-types/line.js
// for the interface contract.
PlotTypes.register({
  key: 'scatter',
  label: 'Scatter',
  icon: '<path d="M4 19V5M4 19h16"/><circle cx="8" cy="15" r="1.5"/><circle cx="13" cy="9" r="1.5"/><circle cx="17" cy="13" r="1.5"/><circle cx="19" cy="6" r="1.5"/>',
  axes: ['x', 'y'],
  supportsGrid: true,
  supportsDash: false,

  buildTrace(entry, getColumn) {
    const { xFile, xCol, yFile, yCol, color } = entry
    return {
      x: getColumn(xFile, xCol),
      y: getColumn(yFile, yCol),
      name: yCol,
      mode: 'markers',
      type: 'scatter',
      marker: { color, size: 7 },
    }
  },

  buildLayout(args) { return Cartesian2D.buildLayout(args) },
  themeRelayoutKeys(theme) { return Cartesian2D.themeRelayoutKeys(theme) },
})
