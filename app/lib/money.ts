/**
 * Platform fees are a cost and must be stored as a POSITIVE number.
 *
 * Both profit models depend on it:
 *   Orders page   profit = payout - shipping - cogs   (payout is already net of fees)
 *   Finance / Tax profit = gross - fees - expenses    (so `gross - fees` must equal payout)
 *
 * A negative fee makes the second model ADD the fee to profit instead of subtracting it.
 * TikTok's settlement export writes fees negative ("-1.63"), so pasting that column
 * straight into the Settle page stored 497 orders with the wrong sign and overstated
 * profit by £1,274.72 before this was caught.
 *
 * Gross, payout and shipping are left alone — only the fee sign is normalised.
 */
export function feeAmount(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.abs(n) : 0;
}
