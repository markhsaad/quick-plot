// Tiny plugin registry for plot types. Each file under js/plot-types/ calls
// PlotTypes.register({...}) at load time; core app code (the plot-editing
// form, showChart, applyThemeToCharts, and the export handler) drives itself
// off PlotTypes.list()/.get() instead of hardcoding which types exist, so
// adding a new plot type never requires touching those functions.
const PlotTypes = (() => {
  const registry = new Map()
  return {
    register(def) { registry.set(def.key, def) },
    get(key) { return registry.get(key) },
    list() { return [...registry.values()] },
  }
})()
