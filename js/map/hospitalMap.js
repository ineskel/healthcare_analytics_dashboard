// /js/map/hospitalMap.js
import { state } from '../state.js'

const TOP_N = 1000
const DEFAULTS = { containerId: 'viewDiv' }

const EURASIA_REGIONS = [
  {
    name: 'Central Eurasia',
    weight: 0.34,
    bbox: { minLon: 45, maxLon: 90, minLat: 30, maxLat: 55 },
    anchors: [
      { lon: 69.24, lat: 41.31, w: 0.22 },
      { lon: 76.89, lat: 43.24, w: 0.22 },
      { lon: 71.43, lat: 51.17, w: 0.18 },
      { lon: 51.39, lat: 35.69, w: 0.18 },
      { lon: 67.0, lat: 39.65, w: 0.2 }
    ],
    jitter: { lon: 10.0, lat: 6.0 }
  },
  {
    name: 'Europe',
    weight: 0.14,
    bbox: { minLon: -10, maxLon: 40, minLat: 36, maxLat: 60 },
    anchors: [
      { lon: 2.35, lat: 48.86, w: 0.2 },
      { lon: 12.49, lat: 41.9, w: 0.18 },
      { lon: 19.04, lat: 47.5, w: 0.18 },
      { lon: 30.52, lat: 50.45, w: 0.22 },
      { lon: -0.13, lat: 51.51, w: 0.22 }
    ],
    jitter: { lon: 6.0, lat: 3.5 }
  },
  {
    name: 'Russia / North Eurasia',
    weight: 0.12,
    bbox: { minLon: 30, maxLon: 140, minLat: 50, maxLat: 70 },
    anchors: [
      { lon: 37.62, lat: 55.75, w: 0.35 },
      { lon: 60.6, lat: 56.84, w: 0.2 },
      { lon: 82.93, lat: 55.03, w: 0.2 },
      { lon: 104.28, lat: 52.28, w: 0.1 },
      { lon: 131.88, lat: 43.12, w: 0.15 }
    ],
    jitter: { lon: 10.0, lat: 4.0 }
  },
  {
    name: 'Middle East',
    weight: 0.1,
    bbox: { minLon: 30, maxLon: 60, minLat: 20, maxLat: 40 },
    anchors: [
      { lon: 46.71, lat: 24.71, w: 0.25 },
      { lon: 44.37, lat: 33.31, w: 0.25 },
      { lon: 51.39, lat: 35.69, w: 0.25 },
      { lon: 35.21, lat: 31.77, w: 0.25 }
    ],
    jitter: { lon: 5.0, lat: 3.0 }
  },
  {
    name: 'South Asia',
    weight: 0.16,
    bbox: { minLon: 65, maxLon: 95, minLat: 8, maxLat: 30 },
    anchors: [
      { lon: 77.21, lat: 28.61, w: 0.3 },
      { lon: 72.88, lat: 19.08, w: 0.25 },
      { lon: 88.36, lat: 22.57, w: 0.25 },
      { lon: 90.41, lat: 23.81, w: 0.2 }
    ],
    jitter: { lon: 5.0, lat: 3.5 }
  },
  {
    name: 'East Asia',
    weight: 0.1,
    bbox: { minLon: 100, maxLon: 140, minLat: 20, maxLat: 45 },
    anchors: [
      { lon: 116.4, lat: 39.9, w: 0.3 },
      { lon: 121.47, lat: 31.23, w: 0.3 },
      { lon: 126.98, lat: 37.57, w: 0.2 },
      { lon: 139.69, lat: 35.68, w: 0.2 }
    ],
    jitter: { lon: 6.0, lat: 3.5 }
  },
  {
    name: 'Southeast Asia',
    weight: 0.04,
    bbox: { minLon: 95, maxLon: 130, minLat: 0, maxLat: 20 },
    anchors: [
      { lon: 100.5, lat: 13.75, w: 0.25 },
      { lon: 106.63, lat: 10.82, w: 0.25 },
      { lon: 103.82, lat: 1.35, w: 0.25 },
      { lon: 121.0, lat: 14.6, w: 0.25 }
    ],
    jitter: { lon: 5.5, lat: 3.0 }
  }
]

const MIN_SEPARATION_DEG = 0.04
const MAX_TRIES_PER_POINT = 40

export function initHospitalMap({ containerId = DEFAULTS.containerId, data = state.data } = {}) {
  if (!data || !data.length) {
    console.warn('[hospitalMap] No data provided.')
    return
  }

  const amdRequire = window.require
  if (typeof amdRequire !== 'function') {
    console.error('[hospitalMap] ArcGIS AMD loader not found. Include https://js.arcgis.com/4.29/')
    return
  }

  amdRequire(
    ['esri/Map', 'esri/views/MapView', 'esri/layers/FeatureLayer', 'esri/Graphic', 'esri/geometry/Point'],
    (Map, MapView, FeatureLayer, Graphic, Point) => {
      const hospitals = buildHospitalStatsTopN_Grouped(data, TOP_N)
      state._mapHospitals = hospitals

      assignEurasiaCoords(hospitals)
     
      const layer = buildHospitalLayer({ FeatureLayer, Graphic, Point, hospitals })

      const map = new Map({ basemap: 'gray-vector' })
      const view = new MapView({
        container: containerId,
        map,
        center: [75, 35],
        zoom: 2.8,
        constraints: { snapToZoom: false }
      })

      map.add(layer)

      enableHoverPopup(view, layer)
      enableClickSelection(view, layer)

      state.mapView = view
      state.hospitalLayer = layer

      console.log(`[hospitalMap] Eurasia scatter top ${TOP_N}:`, hospitals.length)
    }
  )
}

/* -------------------------
   Aggregation (GROUPED by HospitalKey)
------------------------- */
function buildHospitalStatsTopN_Grouped(rows, topN) {
  const map = new Map()

  for (const r of rows) {
    const key = normalizeKey(r.HospitalKey ?? r.Hospital ?? r['Hospital'])
    if (!key) continue

    const billing =
      r.BillingAmount != null
        ? +r.BillingAmount
        : r['Billing Amount'] != null
          ? +r['Billing Amount']
          : NaN

    const illness =
      r.MedicalCondition != null
        ? r.MedicalCondition
        : r['Medical Condition'] != null
          ? r['Medical Condition']
          : null

    const testResult =
  r.TestResults != null
    ? r.TestResults
    : r['Test Results'] != null
      ? r['Test Results']
      : null

          if (!map.has(key)) {
  map.set(key, {
    hospitalKey: key,
    sampleRaw: String(r.HospitalRaw ?? r.Hospital ?? r['Hospital'] ?? ''),
    patientCount: 0,
    billingSum: 0,
    billingCount: 0,
    illnessCounts: new Map(),
    testCounts: new Map() // ✅ ADD
  })
}


    const e = map.get(key)
    e.patientCount += 1

    if (Number.isFinite(billing)) {
      e.billingSum += billing
      e.billingCount += 1
    }

    if (illness) e.illnessCounts.set(illness, (e.illnessCounts.get(illness) || 0) + 1)
    if (testResult) e.testCounts.set(testResult, (e.testCounts.get(testResult) || 0) + 1)

  }

  const all = []
  for (const e of map.values()) {
    all.push({
  hospitalKey: e.hospitalKey,
  hospitalLabel: e.hospitalKey,
  sampleRaw: e.sampleRaw,
  patientCount: e.patientCount,
  avgBilling: e.billingCount ? e.billingSum / e.billingCount : 0,
  dominantIllness: getDominantCategory(e.illnessCounts),
  dominantTest: getDominantCategory(e.testCounts), // ✅ ADD
  lon: null,
  lat: null
})

  }

  all.sort((a, b) => b.patientCount - a.patientCount)
  return all.slice(0, topN)
}

function normalizeKey(name) {
  const s = String(name || '').trim()
  if (!s) return null
  return s.toUpperCase()
}

function getDominantCategory(countMap) {
  let best = null
  let bestCount = -1
  for (const [k, v] of countMap.entries()) {
    if (v > bestCount) {
      best = k
      bestCount = v
    }
  }
  return best || 'Unknown'
}

/* -------------------------
   Eurasia placement
------------------------- */
function assignEurasiaCoords(hospitals) {
  const placed = []

  for (const h of hospitals) {
    const seed = hashString(h.hospitalKey)
    const rng = mulberry32(seed)

    const region = pickWeighted(EURASIA_REGIONS, rng())
    const anchor = pickWeighted(region.anchors, rng())

    let chosen = null

    for (let i = 0; i < MAX_TRIES_PER_POINT; i++) {
      const lon = clamp(
        anchor.lon + (rng() - 0.5) * 2 * region.jitter.lon,
        region.bbox.minLon,
        region.bbox.maxLon
      )
      const lat = clamp(
        anchor.lat + (rng() - 0.5) * 2 * region.jitter.lat,
        region.bbox.minLat,
        region.bbox.maxLat
      )

      const cand = { lon, lat }
      if (isFarEnough(cand, placed, MIN_SEPARATION_DEG)) {
        chosen = cand
        break
      }
      chosen = cand
    }

    h.lon = chosen.lon
    h.lat = chosen.lat
    placed.push(chosen)
  }
}

function pickWeighted(items, u01) {
  const total = items.reduce((s, it) => s + (it.weight ?? it.w ?? 0), 0)
  let acc = 0
  const target = u01 * total

  for (const it of items) {
    acc += (it.weight ?? it.w ?? 0)
    if (target <= acc) return it
  }
  return items[items.length - 1]
}

function isFarEnough(p, placed, minSep) {
  for (const q of placed) {
    const dx = p.lon - q.lon
    const dy = p.lat - q.lat
    if (dx * dx + dy * dy < minSep * minSep) return false
  }
  return true
}

/* -------------------------
   Layer creation
------------------------- */
function buildHospitalLayer({ FeatureLayer, Graphic, Point, hospitals }) {
  const fields = [
    { name: 'ObjectID', alias: 'ObjectID', type: 'oid' },
    { name: 'HospitalKey', alias: 'HospitalKey', type: 'string' },
    { name: 'HospitalLabel', alias: 'Hospital', type: 'string' },
    { name: 'SampleRaw', alias: 'Sample Raw Name', type: 'string' },
    { name: 'Patients', alias: 'Patients', type: 'integer' },
    { name: 'AvgBilling', alias: 'Avg Billing', type: 'double' },
    { name: 'DominantIllness', alias: 'Dominant Illness', type: 'string' },
    { name: 'DominantTest', alias: 'Dominant Test Result', type: 'string' },

  ]

  const source = hospitals.map((d, idx) =>
    new Graphic({
      geometry: new Point({ longitude: d.lon, latitude: d.lat }),
      attributes: {
        ObjectID: idx + 1,
        HospitalKey: d.hospitalKey,
        HospitalLabel: d.hospitalLabel,
        SampleRaw: d.sampleRaw,
        Patients: d.patientCount,
        AvgBilling: d.avgBilling,
        DominantIllness: d.dominantIllness,
        DominantTest: d.dominantTest

      }
    })
  )

  const renderer = {
    type: 'simple',
    symbol: {
      type: 'simple-marker',
      size: 7,
      color: [76, 120, 168, 0.85],
      outline: { color: [255, 255, 255, 0.9], width: 0.6 }
    }
  }

  // show hospital name labels when zoomed in
  const labelingInfo = [
    {
      labelExpressionInfo: { expression: '$feature.HospitalLabel' },
      labelPlacement: 'above-center',
      minScale: 3000000,
      symbol: {
        type: 'text',
        color: 'black',
        haloColor: 'white',
        haloSize: 1,
        font: { size: 10, family: 'sans-serif', weight: 'bold' }
      }
    }
  ]

  // cluster stats fields
  const featureReduction = {
    type: 'cluster',
    clusterRadius: '90px',
    fields: [
      {
        name: 'sumPatients',
        alias: 'Total Patients',
        onStatisticField: 'Patients',
        statisticType: 'sum'
      },
      {
        name: 'avgBillingCluster',
        alias: 'Avg Billing (Cluster)',
        onStatisticField: 'AvgBilling',
        statisticType: 'avg'
      }
    ],
    labelingInfo: [
      {
        labelExpressionInfo: { expression: "Text($feature.cluster_count, '#,###')" },
        symbol: { type: 'text', color: 'white', font: { weight: 'bold', size: 12 } },
        labelPlacement: 'center-center'
      }
    ]
  }

  const popupTemplate = {
    title: '{HospitalLabel}',
    content: [
      {
        type: 'fields',
        fieldInfos: [
          { fieldName: 'Patients', label: 'Number of Patients' },
          { fieldName: 'AvgBilling', label: 'Average Billing', format: { digitSeparator: true, places: 2 } },
          { fieldName: 'DominantIllness', label: 'Dominant Illness' },
          { fieldName: 'SampleRaw', label: 'Raw Name' },
          { fieldName: 'DominantTest', label: 'Dominant Test Result' },

        ]
      }
    ]
  }

  return new FeatureLayer({
    title: `Hospitals (Top ${TOP_N}) - Eurasia (Grouped)`,
    source,
    fields,
    objectIdField: 'ObjectID',
    geometryType: 'point',
    spatialReference: { wkid: 4326 },
    renderer,
    popupTemplate,
    outFields: ['*'],
    labelingInfo,
    featureReduction
  })
}

/* -------------------------
   Hover popup (only map popup)
------------------------- */
function enableHoverPopup(view, layer) {
  let hoverTimeout = null

  view.on('pointer-move', event => {
    if (hoverTimeout) return

    hoverTimeout = setTimeout(async () => {
      hoverTimeout = null

      const hit = await view.hitTest(event)
      const result = hit.results.find(r => r.graphic?.layer === layer)
      if (!result) {
        view.closePopup()
        return
      }

      const g = result.graphic
      const a = g.attributes || {}

      // cluster hover
      if (a.cluster_count != null) {
        // best-effort: if cluster_count === 1, show hospital-ish details
        if (+a.cluster_count === 1) {
          view.openPopup({
            title: a.HospitalLabel || a.HospitalKey || 'Hospital',
            content: `
              <div>
                <div><strong>Patients:</strong> ${formatInt(a.Patients ?? a.sumPatients ?? 0)}</div>
                <div><strong>Avg Billing:</strong> ${formatMoney(a.AvgBilling ?? a.avgBillingCluster ?? 0)}</div>
                <div><strong>Dominant Illness:</strong> ${a.DominantIllness ?? 'Unknown'}</div>
                <div><strong>Dominant Test:</strong> ${a.DominantTest ?? 'Unknown'}</div>
              </div>
            `,
            location: g.geometry
          })
          return
        }

        view.openPopup({
          title: 'Cluster',
          content: `
            <div>
              <div><strong>Hospitals:</strong> ${formatInt(a.cluster_count)}</div>
              <div><strong>Total Patients:</strong> ${formatInt(a.sumPatients ?? 0)}</div>
              <div><strong>Avg Billing:</strong> ${formatMoney(a.avgBillingCluster ?? 0)}</div>
            </div>
          `,
          location: g.geometry
        })
        return
      }

      // point hover
      view.openPopup({
        title: a.HospitalLabel || a.HospitalKey || 'Hospital',
        content: `
          <div>
            <div><strong>Patients:</strong> ${formatInt(a.Patients)}</div>
            <div><strong>Avg Billing:</strong> ${formatMoney(a.AvgBilling)}</div>
            <div><strong>Dominant Illness:</strong> ${a.DominantIllness ?? 'Unknown'}</div>
            <div><strong>Dominant Test:</strong> ${a.DominantTest ?? 'Unknown'}</div>
          </div>
        `,
        location: g.geometry
      })
    }, 60)
  })

  view.on('pointer-leave', () => view.closePopup())
}

/* -------------------------
   Click selection: dispatch ONLY (detail pane updates in mapPage.js)
------------------------- */
function enableClickSelection(view, layer) {
  let layerViewPromise = null
  const getLayerView = () => {
    if (!layerViewPromise) layerViewPromise = view.whenLayerView(layer)
    return layerViewPromise
  }

  view.on('click', async (event) => {
    const hit = await view.hitTest(event)
    const result = hit.results.find(r => r.graphic?.layer === layer)
    if (!result) return

    const attrs = result.graphic.attributes || {}

    // -------------------------
    // 1) Cluster click
    // -------------------------
    if (attrs.cluster_count != null) {
      const lv = await getLayerView()

      // Query member features of this cluster
      const q = lv.createQuery()
      q.geometry = result.graphic.geometry
      q.distance = 0
      q.spatialRelationship = 'intersects'
      q.outFields = ['ObjectID', 'HospitalKey']
      q.returnGeometry = false

      const res = await lv.queryFeatures(q)

      const objectIds = res.features.map(f => f.attributes.ObjectID).filter(Boolean)

      // Filter state.filteredData based on HospitalKey if possible
      const keys = new Set(res.features.map(f => String(f.attributes.HospitalKey || '').toUpperCase()).filter(Boolean))
      state.filteredData = (state.data || []).filter(d => keys.has(String(d.HospitalKey || '').toUpperCase()))

      document.dispatchEvent(
        new CustomEvent('cluster-selected', {
          detail: { objectIds }
        })
      )

      return
    }

    // -------------------------
    // 2) Single hospital click
    // -------------------------
    const hospitalKey = String(attrs.HospitalKey || '').trim()
    if (!hospitalKey) return

    state.selectedHospitalKey = hospitalKey

    const target = hospitalKey.toUpperCase()
    state.filteredData = (state.data || []).filter(d => {
      const k = String(d.HospitalKey ?? '').trim().toUpperCase()
      return k === target
    })

    document.dispatchEvent(
      new CustomEvent('hospital-selected', {
        detail: {
          hospitalKey,
          patients: attrs.Patients,
          avgBilling: attrs.AvgBilling,
          dominantIllness: attrs.DominantIllness
        }
      })
    )
  })
}

/* -------------------------
   Helpers
------------------------- */
function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x))
}

function hashString(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed) {
  let t = seed >>> 0
  return function () {
    t += 0x6d2b79f5
    let x = Math.imul(t ^ (t >>> 15), 1 | t)
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

function formatInt(x) {
  const n = +x
  if (!Number.isFinite(n)) return '0'
  return n.toLocaleString()
}

function formatMoney(x) {
  const n = +x
  if (!Number.isFinite(n)) return '0'
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
