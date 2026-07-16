// Histogram plot type — a single-axis distribution, unlike the other types
// here. Exercises the generic axes-array system with axes.length === 1: the
// form ends up with just an X picker/label/range and no Y column at all,
// with zero changes needed in the shared plot-editor code. See
// js/plot-types/line.js for the full interface contract.
PlotTypes.register({
  key: 'histogram',
  label: 'Histogram',
  icon: '<path d="M3 20h18M5 20v-6h3v6M10 20V8h3v12M15 20v-9h3v9"/>',
  axes: ['x'],
  supportsGrid: true,
  supportsDash: false,

  extraOptions: [
    { key: 'binSize', label: 'Bin Width', type: 'number', placeholder: 'Auto' },
    { key: 'histnorm', label: 'Normalization', type: 'select', default: '', options: [
        ['', 'Count'],
        ['percent', 'Percent'],
        ['probability', 'Probability'],
        ['density', 'Density'],
        ['probability density', 'Probability Density'],
      ] },
  ],

  buildTrace(entry, getColumn, opts = {}) {
    const { xFile, xCol, color } = entry
    const trace = {
      x: getColumn(xFile, xCol),
      name: xCol,
      type: 'histogram',
      marker: { color, opacity: 0.75 },
    }
    if (opts.histnorm) trace.histnorm = opts.histnorm
    if (opts.binSize !== undefined) { trace.xbins = { size: opts.binSize }; trace.autobinx = false }
    return trace
  },

  buildLayout(args) {
    return Cartesian2D.buildLayout({ ...args, yAxis: false, extra: { barmode: args.traceCount > 1 ? 'overlay' : undefined } })
  },
  themeRelayoutKeys(theme) { return Cartesian2D.themeRelayoutKeys(theme) },
})
