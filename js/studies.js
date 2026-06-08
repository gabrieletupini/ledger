// Standalone long-form essays — each a self-contained HTML file under
// /studies/<category>/<subcategory>/<slug>.html, opening in a new tab and
// downloading as a complete document. Same pattern as stoa's studies.
//
// An event references articles via a `studyIds` array on its Firestore doc,
// so a buy/sell/thesis can be backed by the reading that informed it.

export const STUDIES = [
  {
    id: 'snp-own-everything',
    title: 'Own Everything, Predict Nothing',
    excerpt:
      "Why the greatest stock-picker of the last century left his wife instructions to buy a fund that chooses nothing at all — and what that means for an investor abroad, where the answer turns less on the fund than on the tax wrapper around it.",
    readingMinutes: 14,
    file: 'studies/indexes/snp500/own-everything-predict-nothing.html',
    publishedAt: '2026-06-08',
    category: 'indexes',
    subcategory: 'snp500',
    ticker: 'SPY',
  },
  {
    id: 'snp-down-years',
    title: 'The Down Years',
    excerpt:
      "The S&P 500 has spent roughly one calendar year in four going down — sometimes a polite single-digit dip, sometimes losing a third of its value. The down years are not anomalies in the trend. They are the trend. The only thing hidden from you is the order in which they arrive.",
    readingMinutes: 12,
    file: 'studies/indexes/snp500/the-down-years.html',
    publishedAt: '2026-06-08',
    category: 'indexes',
    subcategory: 'snp500',
    ticker: 'SPY',
  },
];
