import { DateTime } from "luxon"

export function createSessionContextFormatter(locale: string) {
  return {
    number(value: number | null | undefined) {
      if (value === undefined) return "—"
      if (value === null) return "—"
      return value.toLocaleString(locale)
    },
    percent(value: number | null | undefined) {
      if (value === undefined) return "—"
      if (value === null) return "—"
      return value.toLocaleString(locale) + "%"
    },
    compact(value: number | null | undefined) {
      if (value === undefined) return "—"
      if (value === null) return "—"
      if (value < 1000) return value.toLocaleString(locale)
      if (value < 1_000_000) return (value / 1000).toLocaleString(locale, { maximumFractionDigits: 1 }) + "k"
      return (value / 1_000_000).toLocaleString(locale, { maximumFractionDigits: 1 }) + "m"
    },
    time(value: number | undefined) {
      if (!value) return "—"
      return DateTime.fromMillis(value).setLocale(locale).toLocaleString(DateTime.DATETIME_MED)
    },
  }
}
