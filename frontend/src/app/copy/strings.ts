// ══════════════════════════════════════════════════════════════════
// COPY — Warm, precise, personal copy for every module.
// Empty states guide the user. Errors are human. Success is mild.
// ══════════════════════════════════════════════════════════════════

export const COPY = {
  home: {
    greeting: {
      morning: 'Good morning, Hans. Your ecosystem is in harmony.',
      afternoon: 'Good afternoon, Hans. A perfect moment to continue.',
      evening: 'Good evening, Hans. Reflect on today\'s journey.',
    },
  },

  reading: {
    empty: {
      library: 'Your library is waiting. Add your first book and watch your reading world grow.',
      completed: 'You haven\'t finished any books yet. Every page counts — your first completed book will be celebrated here.',
      authors: 'No authors yet. Each author you add enriches your literary map.',
      sagas: 'No sagas tracked. Group your series and watch the story unfold.',
      genres: 'No genres defined. Categorize your reads and discover patterns.',
    },
    loading: {
      books: 'Gathering your reads...',
      stats: 'Crunching your reading data...',
      session: 'Preparing your reading sanctuary...',
    },
    error: {
      load: 'We couldn\'t reach your library. Check your connection and try again.',
      save: 'We couldn\'t save your book. Give it another try.',
    },
    success: {
      bookSaved: 'Bookmarked. {count} book this month.',
      sessionComplete: 'Session complete. {minutes} minutes of pure reading.',
      bookFinished: 'Congratulations! {title} joins your hall of fame.',
    },
  },

  cinema: {
    empty: {
      library: 'Your cinema is empty. Search for movies and shows to build your collection.',
      search: 'No results found. Try a different title or explore by genre.',
    },
    loading: {
      search: 'Searching across the cinematic universe...',
      library: 'Loading your collection...',
    },
  },

  spending: {
    empty: {
      expenses: 'No expenses yet. Your financial story starts with the first entry.',
      income: 'No income recorded. Track what comes in to see your full picture.',
      budget: 'No budget set. Define your plan and watch your money work for you.',
      savings: 'Start your first savings goal. Every journey begins with a target.',
      loans: 'No loans tracked. Keep tabs on what you lend and borrow.',
      places: 'No places saved. Add your favorite spots and see where your money goes.',
      people: 'No people added. Track shared expenses with friends and family.',
      cards: 'No cards added. Link your payment methods to unlock insights.',
    },
    loading: {
      expenses: 'Calculating your spending patterns...',
      budget: 'Building your budget view...',
      savings: 'Tracking your progress...',
    },
    error: {
      load: 'We hit a snag loading your finances. Try again in a moment.',
      save: 'Couldn\'t save. Check your connection and try again.',
    },
    success: {
      expenseSaved: 'Expense logged. {count} this month so far.',
      budgetSaved: 'Budget updated. You\'re in control.',
      goalCreated: 'Goal set. Every contribution brings you closer.',
      loanRecorded: 'Loan recorded. Your ledger stays balanced.',
    },
  },

  growth: {
    empty: {
      data: 'Your growth journey awaits. Start tracking to see your evolution.',
    },
  },

  mindfulness: {
    empty: {
      sessions: 'No sessions yet. A moment of calm is just a breath away.',
    },
  },
};
