import { hospitalLocations } from './hospitalLocations.js'
import { computeHospitalStats } from './hospitalStats.js'
import { state } from '../state.js'
import { renderTestResultsBar } from '../charts/testResultsBar.js'

export function initMap() {
  require([
    'esri/Map',
    'esri/views/MapView',
    'esri/Graphic'
  ], (Map, MapView, Graphic) => {

    const map = new Map({
      basemap: 'gray-vector'
    })

    const view = new MapView({
      container: 'map',
      map,
      center: [-95, 38],
      zoom: 4
    })

    const hospitalStats = computeHospitalStats(state.data)

    hospitalStats.forEach(h => {
      const coords = hospitalLocations[h.hospital]
      if (!coords) return

      const graphic = new Graphic({
        geometry: {
          type: 'point',
          longitude: coords.lon,
          latitude: coords.lat
        },
        symbol: {
          type: 'simple-marker',
          color: 'steelblue',
          size: 10
        },
        attributes: h,
        popupTemplate: {
          title: '{hospital}',
          content: `
            <b>Patients:</b> {totalPatients}<br/>
            <b>Avg Billing:</b> ${h.avgBilling.toFixed(2)}<br/>
            <b>Dominant Result:</b> {dominantTestResult}
          `
        }
      })

      // CLICK → update D3 charts
      graphic.on('click', () => {
        state.filteredData = h.records
        renderTestResultsBar(h.records)
      })

      view.graphics.add(graphic)
    })
  })
}
