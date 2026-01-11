export function addDerivedFeatures(d) {
  const lengthOfStay =
    (d.DischargeDate - d.AdmissionDate) /
    (1000 * 60 * 60 * 24)

  let ageGroup = 'Unknown'
  if (d.Age !== null) {
    if (d.Age <= 18) ageGroup = '0–18'
    else if (d.Age <= 40) ageGroup = '19–40'
    else if (d.Age <= 65) ageGroup = '41–65'
    else ageGroup = '65+'
  }

  return {
    ...d,
    LengthOfStay: lengthOfStay,
    AgeGroup: ageGroup
    // Dates intentionally kept
  }
}
