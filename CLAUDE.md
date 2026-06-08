# Ledger — notes for Claude

Sibling of stoa. Same architecture, different domain: a personal finance journal with a library of long-form essays and a calendar of dated events (buys, sells, theses, observations).

## Setup status

The Firebase project does **not yet exist**. [js/firebase.js](js/firebase.js) has placeholder values (`REPLACE_ME`) for `apiKey`, `messagingSenderId`, and `appId`. Until those are filled in from a real Firebase project, the app will fail to initialise.

To set up:
1. Create a new Firebase project (suggested id: `ledger-journal-db`).
2. Enable Google authentication.
3. Add a Web App to the project, copy the config snippet, paste into [js/firebase.js](js/firebase.js).
4. Deploy [firestore.rules](firestore.rules) — `firebase deploy --only firestore:rules` from this directory.

## Library vs. events

- **Articles** are static HTML files under `studies/<category>/<subcategory>/<slug>.html`, registered in [js/studies.js](js/studies.js). They render with their own embedded styling (Spectral, oxblood/laurel) so they look like a coherent series, not the journal shell.
- **Events** are user-logged Firestore documents in the `events` collection. Each has `date`, `type`, optional `ticker`, `amount`, `note`, and a `studyIds` array linking to articles.

## Adding a new article

1. Drop the standalone HTML into `studies/<category>/<subcategory>/`.
2. Add an entry to `STUDIES` in [js/studies.js](js/studies.js) with `category`, `subcategory`, `ticker`, etc.
3. If introducing a new category or subcategory, add it to `CATEGORIES` in [js/seed-content.js](js/seed-content.js).
