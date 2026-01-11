// Aggregate by month using discharge date
export function monthlyAverageBilling(data) {
  // Floor discharge dates to first of the month
  const series = d3.rollups(
    data,
    v => ({
      avgBilling: d3.mean(v, d => d.BillingAmount),
      count: v.length
    }),
    d => new Date(d.DischargeDate.getFullYear(), d.DischargeDate.getMonth(), 1)
  )
  .map(([date, stats]) => ({
    date,
    avgBilling: stats.avgBilling,
    count: stats.count
  }))
  .sort((a, b) => d3.ascending(a.date, b.date))

  return series
}
