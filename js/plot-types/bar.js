// Bar chart plot type. See js/plot-types/line.js for the interface contract.
PlotTypes.register({
  key: 'bar',
  label: 'Bar',
  icon: '<path d="M4 20V10M10 20V4M16 20v-7M4 20h16"/>',
  axes: ['x', 'y'],
  supportsGrid: true,
  supportsDash: false,

  buildTrace(entry, getColumn) {
    const { xFile, xCol, yFile, yCol, color } = entry
    return {
      x: getColumn(xFile, xCol),
      y: getColumn(yFile, yCol),
      name: yCol,
      type: 'bar',
      marker: { color },
    }
  },

  buildLayout(args) {
    return Cartesian2D.buildLayout({ ...args, extra: { barmode: args.traceCount > 1 ? 'group' : undefined } })
  },
  themeRelayoutKeys(theme) { return Cartesian2D.themeRelayoutKeys(theme) },
})
