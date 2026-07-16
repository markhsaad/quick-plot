// App bootstrap — runs last, after every other module has registered its
// functions and wired its own DOM listeners. Currently just seeds the
// sample dataset so the app isn't empty on first load.

// Auto-load sample dataset
;(() => {
  // Deterministic PRNG (mulberry32) so the sample dataset is identical on
  // every page load instead of changing each time like Math.random() would.
  function pseudoRandom(seed) {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  // Box-Muller transform, driven by the PRNG above, for a proper bell-curve
  // column — good for demoing the histogram plot type (sine/noise-based
  // columns are bounded/periodic, not normally distributed).
  function gaussianAt(i) {
    const u1 = Math.max(pseudoRandom(i * 2), 1e-9) // avoid log(0)
    const u2 = pseudoRandom(i * 2 + 1)
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  }

  // Cycled per row for a string/category column — demonstrates the bar
  // plot's x-axis working as a category axis rather than a numeric one,
  // and exercises the string-column import path.
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  const name = 'sample.csv'
  const cols = 'time,day,sine,cosine,damped_sine,sawtooth,square,triangle,chirp,noise,ramp,sigmoid,exp_growth,exp_decay,pulse,events,gaussian'
  const rows = [cols]
  for (let i = 0; i < 500; i++) {
    const t = +(i * 0.05).toFixed(2)
    const day = days[i % 7]
    const τ = 2 * Math.PI * t
    const sine        = +(Math.sin(τ)).toFixed(4)
    const cosine      = +(Math.cos(τ)).toFixed(4)
    const damped      = +(Math.exp(-t * 0.25) * Math.sin(τ)).toFixed(4)
    const sawtooth    = +((t % 1)).toFixed(4)
    const square      = Math.sin(τ) >= 0 ? 1 : -1
    const triangle    = +(2 / Math.PI * Math.asin(Math.sin(τ))).toFixed(4)
    const chirp       = +(Math.sin(2 * Math.PI * (0.1 + 0.4 * (t / 25)) * t)).toFixed(4)
    const noise       = +(Math.sin(τ * 7.3) * 0.4 + Math.sin(τ * 13.7) * 0.3 + Math.sin(τ * 23.1) * 0.3).toFixed(4)
    const ramp        = +((t % 5) / 5).toFixed(4)
    const sigmoid     = +(1 / (1 + Math.exp(-(t - 12.5)))).toFixed(4)
    const exp_growth  = +(Math.exp(t * 0.1) / Math.exp(2.5)).toFixed(4)
    const exp_decay   = +(Math.exp(-t * 0.1)).toFixed(4)
    const pulse       = ((i % 20) < 2) ? 1 : 0
    // Small, bar-chart-friendly integer counts — a slow sine trend plus
    // pseudo-random jitter, clamped so they read like event counts per bucket.
    const events      = Math.max(0, Math.round(4 + 3 * Math.sin(τ * 0.15) + (pseudoRandom(i + 10000) * 4 - 2)))
    const gaussian    = +(gaussianAt(i)).toFixed(4)
    rows.push(`${t},${day},${sine},${cosine},${damped},${sawtooth},${square},${triangle},${chirp},${noise},${ramp},${sigmoid},${exp_growth},${exp_decay},${pulse},${events},${gaussian}`)
  }
  datasets[name] = parseCSV(rows.join('\n'))
  addFileEntry(name)
})()
