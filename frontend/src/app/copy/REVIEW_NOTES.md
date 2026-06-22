# Q-007: Copy Review Findings

## Review of `strings.ts`

### Voice & Consistency
The copy is consistently warm, precise, and personal across all modules. Standout patterns:
- **Empty states** guide the user with action-oriented language ("Add your first book and watch your reading world grow.")
- **Error messages** are human and non-technical ("We couldn't reach your library. Check your connection and try again.")
- **Success messages** celebrate mildly with context ("Bookmarked. {count} book this month.")
- All modules maintain the same tone regardless of topic (reading, spending, cinema, etc.).

### Strengths
- Empty states never just say "No data" — every one provides a next step.
- Error messages avoid technical jargon ("Hit a snag" not "HTTP 500").
- The home greeting personalizes by name, which reinforces the "personal app" vibe.
- Template placeholders (`{count}`, `{minutes}`, `{title}`) are used consistently.
- No typos or awkward phrasing detected.

### Suggestion
The `cinema` module lacks `error` and `success` sections (present in `reading` and `spending`). Consider adding them for consistency.

---

## Pages with Hardcoded Strings (Not Using COPY Constants)

### `home.html`
- **"Enter →"** (line 69): The module card button uses a hardcoded label. Should reference a COPY constant (e.g. `COPY.home.enterButton` or similar).

### `reading-completed.html`
- **Empty state** (lines 75-76): Hardcoded as `'No matches'` / `'Try a different keyword.'` (with search query) or `'No completed books yet'` / `'Finish your first book and come back to rate it!'` (without). COPY provides `COPY.reading.empty.completed`: _"You haven't finished any books yet. Every page counts — your first completed book will be celebrated here."_
- **Subtitle** (line 32): "Every story you've finished. Click the stars to rate them." — hardcoded.
- **Stat labels** (lines 36-41): "Completed", "Avg rating", "Pages read" — hardcoded.
- **Sort button labels** (lines 60-62): "Recent", "Top Rated", "A-Z" — hardcoded.
- **Search placeholder** (line 55): "Search by title or author..." — hardcoded.
- **Nav link labels** (lines 12-16): "Library", "Completed", "Authors", "Sagas", "Genres" — hardcoded.

### `expenses.html`
- **Empty state** (lines 194-197): Hardcoded as "No expenses recorded for this period." / "Add your first expense". COPY provides `COPY.spending.empty.expenses`: _"No expenses yet. Your financial story starts with the first entry."_
- **Nav link labels** (lines 11-19): "Income", "Expenses", "Payments", "People", "Loans", "Places", "Budget", "Projections" — hardcoded.
- **Button labels** (lines 22-28): "Add Income", "Add Expense" — hardcoded.
- **Filter tabs** (lines 49-52): "This Month", "This Year", "All Time", "Custom" — hardcoded.
- **"Apply"** (line 65), **"Total spending"** (line 99), **"Categories"** (line 117), **"Transactions"** (line 172) — hardcoded.
- **Trend text** (lines 103-104): "less / more than last month" — hardcoded.
- **Donut label** (line 144): "Top" — hardcoded.
- **"No data for this month"** (line 160) — hardcoded.

### Note
Many of these hardcoded strings are structural UI labels (nav links, button text, section headings) rather than content copy. The current `COPY` constants file focuses on content copy (empty states, errors, success messages). Adding structural labels would require expanding the `COPY` object into sub-sections per page, which is a valid but broader refactor outside the scope of this review.
