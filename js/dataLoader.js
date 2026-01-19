// /js/dataLoader.js
// import * as d3 from './vendor/d3.v7.min.js'

import { state } from './state.js'
import { addDerivedFeatures } from './features.js'

import { renderTestResultsBar } from './charts/testResultsBar.js'
import { renderMonthlyBilling } from './charts/monthlyBillingChart.js'
import { renderGenderPie } from './charts/genderPieChart.js'
import { renderAgeBandAnalysis } from './charts/ageBandAnalysis.js'
import { renderTestResultsVsConditions } from './charts/conditionMatrix.js'
import { renderFeatureInfluence } from './charts/featureInfluence.js'
import { renderAdmissionTypeStacked } from './charts/admissionTypeStacked.js'
import { renderConditionTestHeatmapNormalized } from './charts/conditionTestHeatmapNormalized.js'
import { renderMonthlyAbnormalLine } from './charts/monthlyAbnormalLine.js'


const DATA_PATH = '../data/data.csv'

// Prevent attaching listeners twice if dataLoader.js is imported multiple times
let initialized = false

init()

/* -------------------------
  Hospital grouping strategy (3 meaningful tokens)
  - removes legal suffixes: LLC/LTD/INC/PLC/GROUP/...
  - removes small stopwords: AND/THE/OF/...
  - sorts tokens so word order variations still group together
  - keeps first 3 meaningful tokens => HospitalKey
------------------------- */
const LEGAL_SUFFIXES = new Set(['LLC', 'LTD', 'INC', 'PLC', 'GROUP', 'CORP', 'CO'])
const STOPWORDS = new Set(['AND', 'THE', 'OF', 'FOR', 'IN', 'ON', 'AT', 'BY', 'WITH'])

const HOSPITAL_KEY_TOKENS = 3

function canonicalHospital(name) {
  if (!name) return null

  const cleaned = String(name)
    .toUpperCase()
    .replace(/[^\w\s]/g, ' ') // punctuation -> space
    .replace(/\s+/g, ' ')
    .trim()

  if (!cleaned) return null

  const parts = cleaned.split(' ').filter(Boolean)
  const meaningful = parts.filter(w => !LEGAL_SUFFIXES.has(w) && !STOPWORDS.has(w))

  if (!meaningful.length) return 'UNKNOWN'

  // Stable grouping across word order
  const stable = meaningful.slice().sort()

  return stable.slice(0, HOSPITAL_KEY_TOKENS).join(' ')
}

/* -------------------------
  Load + init
------------------------- */
function init() {
  if (initialized) return
  initialized = true

  // If data already loaded (e.g., hot reload / multiple imports), just render + notify
  if (state.data && state.data.length) {
    renderPage()
    setupListeners()
    dispatchDataLoaded()
    return
  }

  d3.csv(DATA_PATH).then(raw => {
    state.rawData = raw
    state.data = preprocess(raw)

    console.log('Loaded records:', state.data.length)
    console.log('Sample record:', state.data[0])

    logHospitalStats(state.data)

    // Top 50 grouped hospitals (by HospitalKey)
    const top = d3
      .rollups(state.data, v => v.length, d => (d.HospitalKey ?? '').trim().toUpperCase())
      .filter(([h]) => h)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)

    console.table(top.map(([HospitalKey, Patients]) => ({ HospitalKey, Patients })))

    // Always initialize filteredData at least once
    applyFilters()

    // Page-aware charts
    renderPage()

    // Notify other modules/pages (e.g., mapPage.js) that data is ready
    dispatchDataLoaded()

    setupListeners()
  })
}

/* -------------------------
  Listeners
------------------------- */
function setupListeners() {
  // Avoid stacking multiple listeners
  window.removeEventListener('resize', renderPage)
  document.removeEventListener('filters-changed', renderPage)

  window.addEventListener('resize', renderPage)
  document.addEventListener('filters-changed', renderPage)
}

function dispatchDataLoaded() {
  document.dispatchEvent(
    new CustomEvent('data-loaded', {
      detail: { count: state.data?.length || 0 }
    })
  )
}

/* -------------------------
  Preprocessing
------------------------- */
function preprocess(data) {
  return data
    .map((d, i) => {
      const admission = d['Date of Admission'] ? new Date(d['Date of Admission']) : null
      const discharge = d['Discharge Date'] ? new Date(d['Discharge Date']) : null

      const hospitalRaw = d.Hospital || null
      const hospitalKey = canonicalHospital(hospitalRaw)

      return {
        PatientID: i + 1,

        Age: d.Age !== '' ? +d.Age : null,
        BillingAmount: d['Billing Amount'] !== '' ? +d['Billing Amount'] : null,

        AdmissionDate: admission,
        DischargeDate: discharge,

        Gender: d.Gender || null,
        BloodType: d['Blood Type'] || null,
        MedicalCondition: d['Medical Condition'] || null,

        // Keep all 3 for compatibility:
        HospitalRaw: hospitalRaw,      // original string from CSV
        HospitalKey: hospitalKey,      // grouped key
        Hospital: hospitalKey,         // IMPORTANT: keep charts working (they still use d.Hospital)

        InsuranceProvider: d['Insurance Provider'] || null,
        AdmissionType: d['Admission Type'] || null,
        TestResults: d['Test Results'] || null
      }
    })
    .filter(d =>
      d.Age !== null &&
      d.BillingAmount !== null &&
      d.HospitalKey !== null &&
      d.AdmissionDate instanceof Date &&
      d.DischargeDate instanceof Date &&
      !isNaN(d.AdmissionDate) &&
      !isNaN(d.DischargeDate) &&
      d.DischargeDate >= d.AdmissionDate
    )
    .map(addDerivedFeatures)
}

/* -------------------------
  Filters
------------------------- */
function applyFilters() {
  let filtered = state.data || []

  if (state.filters?.gender) {
    filtered = filtered.filter(d => d.Gender === state.filters.gender)
  }

  state.filteredData = filtered
}

/* -------------------------
  PAGE-AWARE RENDERING
------------------------- */
function renderPage() {
  if (!state.data || !state.data.length) return

  applyFilters()

  const path = window.location.pathname

  if (path.includes('patient.html')) {
    renderTestResultsBar()
    renderGenderPie()
    renderAgeBandAnalysis()
    renderMonthlyBilling()
    return
  }

  if (path.includes('hospital.html')) {
    renderMonthlyBilling()
    renderTestResultsBar()
    return
  }

  // if (path.includes('medical.html')) {
  //   renderTestResultsVsConditions()
  //   return
  // }

  if (path.includes('medical.html')) {
  renderFeatureInfluence()
  renderAdmissionTypeStacked()
  renderConditionTestHeatmapNormalized()
  renderMonthlyAbnormalLine()
  return
}


  // Map page: do nothing here
}

/* -------------------------
  Debug helpers
------------------------- */
function logHospitalStats(data) {
  const rawHospitals = data.map(d => d.HospitalRaw?.trim().toUpperCase()).filter(Boolean)
  const groupedHospitals = data.map(d => d.HospitalKey?.trim().toUpperCase()).filter(Boolean)

  console.log('Number of unique hospitals (raw):', new Set(rawHospitals).size)
  console.log('Number of unique hospitals (grouped):', new Set(groupedHospitals).size)
}
