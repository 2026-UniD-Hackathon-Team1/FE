export interface DayRange {
  from: Date
  to: Date
}

export const formatRange = (r: DayRange) => `${r.from.getMonth() + 1}.${r.from.getDate()} ~ ${r.to.getMonth() + 1}.${r.to.getDate()}`
