/**
 * Tax periods for the Paca Prints partnership (Carrie + Vicky, 50/50).
 *
 * UK tax years run 6 April -> 5 April. The partnership started trading on 01/02/2025,
 * so the first period is 01/02/2025 -> 05/04/2025 (tax year 2024-25).
 *
 * Costs bought before trading started count as if spent on the first day of trading,
 * so the first period's EXPENSES start earlier than its ORDERS.
 * HMRC allows pre-trading costs from up to 7 years before trading starts. Carrie confirmed
 * 06/11/2026 that everything logged in Expenses before 01/02/2025 was for Paca, so it all
 * counts in the first period. Anything older than 7 years is listed as a check, not counted.
 *
 * Every function that totals tax figures (Finance page, Tax Year page, Tax Calculator)
 * should use taxPeriod() so they all agree.
 */

export const TRADING_START = "2025-02-01";
export const PRE_TRADING_COSTS_FROM = "2018-02-01"; // 7 years before TRADING_START
export const FIRST_TAX_YEAR = 2024; // 2024-25

export type TaxPeriod = {
  startYear: number;
  label: string; // "2024-25"
  /** Orders and mileage dated >= this */
  ordersFrom: string;
  /** Expenses dated >= this (earlier than ordersFrom in the first period) */
  expensesFrom: string;
  /** Exclusive end for everything (6 April) */
  endExclusive: string;
  /** Last day, for display (5 April) */
  endInclusive: string;
  isFirstPeriod: boolean;
  beforeTrading: boolean;
};

export function taxYearLabel(startYear: number) {
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}

export function taxPeriod(startYear: number): TaxPeriod {
  const ukStart = `${startYear}-04-06`;
  const endExclusive = `${startYear + 1}-04-06`;
  const endInclusive = `${startYear + 1}-04-05`;
  const isFirstPeriod = ukStart <= TRADING_START && TRADING_START < endExclusive;
  const beforeTrading = endExclusive <= TRADING_START;
  return {
    startYear,
    label: taxYearLabel(startYear),
    ordersFrom: isFirstPeriod ? TRADING_START : ukStart,
    expensesFrom: isFirstPeriod ? PRE_TRADING_COSTS_FROM : ukStart,
    endExclusive,
    endInclusive,
    isFirstPeriod,
    beforeTrading,
  };
}

export function currentTaxYearStart(today = new Date()) {
  const y = today.getFullYear();
  return today >= new Date(y, 3, 6) ? y : y - 1;
}

/** Tax years from the first trading year up to (and including) the current one. */
export function tradingTaxYears(today = new Date()) {
  const out: number[] = [];
  for (let y = FIRST_TAX_YEAR; y <= currentTaxYearStart(today); y++) out.push(y);
  return out;
}

/** Online filing deadline note for the partnership return (SA800) and each partner's return. */
export function filingDeadline(startYear: number) {
  if (startYear === 2024) {
    return "3 months from the date on HMRC's notice (it was issued late) — confirm with HMRC";
  }
  return `31/01/${startYear + 2}`;
}

export function fmtDateUK(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}
