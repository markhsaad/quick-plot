// 2D line plot type.
//
// Interface contract (see also js/plot-types/line3d.js for a 3D example, and
// js/plot-types/cartesian2d.js for the shared layout/theme builder that this
// and the other 2D types delegate to):
//   key             - matches panel._plotConfig.type / the session & export format
//   label           - shown on the New Plot type-picker and the in-form toggle
//   icon            - inner SVG markup (path/circle/etc, no wrapping <svg>) for
//                      the type-picker button — see plot-editor.js's showPlotTypePicker
//   axes            - ordered axis list; drives label inputs, range fields,
//                      trace-row signal pickers, and column headers generically
//                      (see app.js's showSignalSelect) — the first axis also
//                      drives the "Dataset" dropdown that scopes the rest
//   supportsGrid    - whether "Show grid" appears in Advanced settings
//   supportsDash    - whether each trace row shows the line-style (solid/
//                      dashed/dotted/...) dropdown — only meaningful for
//                      types that actually draw a line
//   extraOptions    - optional array of type-specific Advanced-settings
//                      fields, rendered generically (see
//                      js/plot-types/histogram.js for an example):
//                        { key, label, type: 'number' | 'select',
//                          placeholder?, options? (for 'select', [value,
//                          label] pairs), default? }
//                      Values land in opts[key] alongside title/labels/
//                      ranges, so they reach buildTrace/buildLayout for free.
//   buildTrace(entry, getColumn, opts)        -> Plotly trace object
//                      (`opts` is the panel-wide settings — title, per-axis
//                      label/min/max, showGrid, and any extraOptions values —
//                      not the trace row itself; most types ignore it)
//   buildLayout({ opts, theme, showGrid, traceCount }) -> Plotly layout object
//                      (shared by both live rendering and export — see
//                      app.js's showChart and the export-btn handler)
//   themeRelayoutKeys(theme)                  -> partial Plotly.relayout()
//                      update object, merged with the shared paper/font/
//                      modebar/hoverlabel keys in applyThemeToCharts
PlotTypes.register({
  key: 'line',
  label: 'Line',
  icon: '<path d="M4 19V5M4 19h16M6 16l4-5 3 3 6-8"/>',
  axes: ['x', 'y'],
  supportsGrid: true,
  supportsDash: true,

  buildTrace(entry, getColumn) {
    const { xFile, xCol, yFile, yCol, color, dash } = entry
    return {
      x: getColumn(xFile, xCol),
      y: getColumn(yFile, yCol),
      name: yCol,
      mode: 'lines',
      type: 'scatter',
      line: { color, dash: dash || 'solid' },
    }
  },

  buildLayout(args) { return Cartesian2D.buildLayout(args) },
  themeRelayoutKeys(theme) { return Cartesian2D.themeRelayoutKeys(theme) },
})
