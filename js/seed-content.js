// Ledger — data catalogs
//
// Event types for the calendar. Add a row to introduce a new kind of event.
// Colours echo the article palette (oxblood / laurel / gold / ink).
export const EVENT_TYPES = [
  { key: 'buy',         label: 'Buy',         color: '#3d5a3a' },  // laurel — adding
  { key: 'sell',        label: 'Sell',        color: '#8a2b22' },  // oxblood — trimming
  { key: 'thesis',      label: 'Thesis',      color: '#9c7c3a' },  // gold — an idea
  { key: 'observation', label: 'Observation', color: '#4a443b' },  // ink-soft — a note
  { key: 'macro',       label: 'Macro',       color: '#b5453a' },  // soft oxblood — external
  { key: 'dividend',    label: 'Dividend',    color: '#6e8a64' },  // laurel — income
  { key: 'rebalance',   label: 'Rebalance',   color: '#7c7468' },  // mute
  { key: 'other',       label: 'Other',       color: '#9c9388' },
];

// Library hierarchy — used to render the filter rows and the breadcrumb on
// each card. Each top-level category groups one or more subcategories.
// New subcategories can be added without touching app.js.
export const CATEGORIES = [
  {
    key: 'indexes',
    label: 'Indexes',
    subcategories: [
      { key: 'snp500', label: 'S&P 500' },
    ],
  },
  {
    key: 'macro',
    label: 'Macro',
    subcategories: [
      { key: 'wages', label: 'Wages & Cost of Living' },
    ],
  },
];

// Look-ups
export const categoryByKey = (k) => CATEGORIES.find(c => c.key === k);
export function subcategoryByKey(catKey, subKey) {
  const c = categoryByKey(catKey);
  return c ? c.subcategories.find(s => s.key === subKey) : null;
}
