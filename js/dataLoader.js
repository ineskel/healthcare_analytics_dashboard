import { state } from './state.js'
import { addDerivedFeatures } from './features.js'
import { renderTestResultsBar } from './charts/testResultsBar.js'
import { renderMonthlyBilling } from './charts/monthlyBillingChart.js'
import { renderGenderPie } from './charts/genderPieChart.js'
import { renderAgeBandAnalysis } from './charts/ageBandAnalysis.js'
import { renderTestResultsVsConditions } from './charts/conditionMatrix.js'

const DATA_PATH = 'data/data.csv'

d3.csv(DATA_PATH).then(raw => {
  state.rawData = raw
  state.data = preprocess(raw)

  console.log('Loaded records:', state.data.length)
  console.log(state.data[0])
  const normalizedHospitals = state.data
  .map(d => d.Hospital?.trim().toUpperCase())
  .filter(Boolean) // remove null / undefined / empty

// Get unique values
  const uniqueHospitals = Array.from(new Set(normalizedHospitals))

// Print results
console.log('Number of unique hospitals:', uniqueHospitals.length)
console.log('Unique hospital names:', uniqueHospitals)

  // Next steps: init charts + map
  
  renderAll()

  window.addEventListener('resize', renderAll)
  document.addEventListener('filters-changed', () => {
  renderAll()
})



})

function preprocess(data) {
  return data
    .map((d, i) => {
      const admission = d['Date of Admission']
        ? new Date(d['Date of Admission'])
        : null

      const discharge = d['Discharge Date']
        ? new Date(d['Discharge Date'])
        : null

      return {
        // --------
        // ID
        // --------
        PatientID: i + 1,

        // --------
        // Numeric
        // --------
        Age: d.Age !== '' ? +d.Age : null,
        BillingAmount:
          d['Billing Amount'] !== ''
            ? +d['Billing Amount']
            : null,

        // --------
        // Dates (kept!)
        // --------
        AdmissionDate: admission,
        DischargeDate: discharge,

        // --------
        // Categorical
        // --------
        Gender: d.Gender || null,
        BloodType: d['Blood Type'] || null,
        MedicalCondition: d['Medical Condition'] || null,
        Hospital: d.Hospital || null,
        InsuranceProvider: d['Insurance Provider'] || null,
        AdmissionType: d['Admission Type'] || null,
        TestResults: d['Test Results'] || null
      }
    })
    // -------------------------
    // Data quality filtering
    // -------------------------
    .filter(d =>
      d.Age !== null &&
      d.BillingAmount !== null &&
      d.Hospital !== null &&
      d.AdmissionDate instanceof Date &&
      d.DischargeDate instanceof Date &&
      !isNaN(d.AdmissionDate) &&
      !isNaN(d.DischargeDate) &&
      d.DischargeDate >= d.AdmissionDate
    )
    // -------------------------
    // Derived features
    // -------------------------
    .map(addDerivedFeatures)
}

function applyFilters() {
  let filtered = state.data

  if (state.filters.gender) {
    filtered = filtered.filter(
      d => d.Gender === state.filters.gender
    )
  }

  state.filteredData = filtered
}

function renderAll() {
  applyFilters()
  renderTestResultsBar(state.filteredData)
  renderMonthlyBilling(state.filteredData)
  renderGenderPie(state.filteredData)
  renderAgeBandAnalysis(state.data)
  renderTestResultsVsConditions(state.data)
}
