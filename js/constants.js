// Player colors - high contrast in both light and dark modes
const PLAYER_COLORS = [
  '#e74c3c', // red
  '#3498db', // blue
  '#2ecc71', // green
  '#f39c12', // orange
  '#9b59b6', // purple
  '#1abc9c', // teal
  '#e67e22', // amber
  '#e84393', // pink
];

const DEFAULT_PLAYER_NAMES = [
  'Player 1', 'Player 2', 'Player 3', 'Player 4',
  'Player 5', 'Player 6', 'Player 7', 'Player 8',
];

const SUITS = [
  { name: 'Hearts', symbol: '\u2665', color: 'red' },
  { name: 'Diamonds', symbol: '\u2666', color: 'red' },
  { name: 'Clubs', symbol: '\u2663', color: 'black' },
  { name: 'Spades', symbol: '\u2660', color: 'black' },
];

// Single deck melds (standard values)
const SINGLE_DECK_MELDS = {
  standard: [
    { id: 'marriage', name: 'Marriage', value: 20, category: 'marriages', meldClass: 'A' },
    { id: 'royal-marriage', name: 'Royal Marriage', value: 40, category: 'marriages', meldClass: 'A' },
    { id: 'run', name: 'Run', value: 150, category: 'runs', meldClass: 'A' },
    { id: 'pinochle', name: 'Pinochle', value: 40, category: 'pinochle', meldClass: 'C' },
    { id: 'dix', name: 'Dix', value: 10, category: 'dix', meldClass: 'A' },
    { id: 'aces-around', name: 'Aces Around', value: 100, category: 'around', meldClass: 'B' },
    { id: 'kings-around', name: 'Kings Around', value: 80, category: 'around', meldClass: 'B' },
    { id: 'queens-around', name: 'Queens Around', value: 60, category: 'around', meldClass: 'B' },
    { id: 'jacks-around', name: 'Jacks Around', value: 40, category: 'around', meldClass: 'B' },
    { id: 'roundhouse', name: 'Roundhouse', value: 240, category: 'special', meldClass: null },
  ],
  npa: [
    { id: 'marriage', name: 'Marriage', value: 20, category: 'marriages', meldClass: 'A' },
    { id: 'royal-marriage', name: 'Royal Marriage', value: 40, category: 'marriages', meldClass: 'A' },
    { id: 'run', name: 'Run', value: 250, category: 'runs', meldClass: 'A' },
    { id: 'pinochle', name: 'Pinochle', value: 150, category: 'pinochle', meldClass: 'C' },
    { id: 'dix', name: 'Dix', value: 10, category: 'dix', meldClass: 'A' },
    { id: 'aces-around', name: 'Aces Around', value: 100, category: 'around', meldClass: 'B' },
    { id: 'kings-around', name: 'Kings Around', value: 80, category: 'around', meldClass: 'B' },
    { id: 'queens-around', name: 'Queens Around', value: 60, category: 'around', meldClass: 'B' },
    { id: 'jacks-around', name: 'Jacks Around', value: 40, category: 'around', meldClass: 'B' },
    { id: 'roundhouse', name: 'Roundhouse', value: 240, category: 'special', meldClass: null },
  ],
};

// Double deck additional melds
const DOUBLE_DECK_MELDS = {
  standard: [
    { id: 'double-pinochle', name: 'Double Pinochle', value: 300, category: 'pinochle', meldClass: 'C' },
    { id: 'triple-pinochle', name: 'Triple Pinochle', value: 600, category: 'pinochle', meldClass: 'C' },
    { id: 'quad-pinochle', name: 'Quad Pinochle', value: 1200, category: 'pinochle', meldClass: 'C' },
    { id: 'double-marriage', name: 'Double Marriage', value: 40, category: 'marriages', meldClass: 'A' },
    { id: 'double-royal-marriage', name: 'Double Royal Marriage', value: 80, category: 'marriages', meldClass: 'A' },
    { id: 'double-run', name: 'Double Run', value: 1500, category: 'runs', meldClass: 'A' },
    { id: 'aces-abound', name: 'Aces Abound', value: 1000, category: 'around', meldClass: 'B' },
    { id: 'kings-abound', name: 'Kings Abound', value: 800, category: 'around', meldClass: 'B' },
    { id: 'queens-abound', name: 'Queens Abound', value: 600, category: 'around', meldClass: 'B' },
    { id: 'jacks-abound', name: 'Jacks Abound', value: 400, category: 'around', meldClass: 'B' },
  ],
  npa: [
    { id: 'double-pinochle', name: 'Double Pinochle', value: 600, category: 'pinochle', meldClass: 'C' },
    { id: 'triple-pinochle', name: 'Triple Pinochle', value: 1200, category: 'pinochle', meldClass: 'C' },
    { id: 'quad-pinochle', name: 'Quad Pinochle', value: 2400, category: 'pinochle', meldClass: 'C' },
    { id: 'double-marriage', name: 'Double Marriage', value: 40, category: 'marriages', meldClass: 'A' },
    { id: 'double-royal-marriage', name: 'Double Royal Marriage', value: 80, category: 'marriages', meldClass: 'A' },
    { id: 'double-run', name: 'Double Run', value: 1500, category: 'runs', meldClass: 'A' },
    { id: 'aces-abound', name: 'Aces Abound', value: 1000, category: 'around', meldClass: 'B' },
    { id: 'kings-abound', name: 'Kings Abound', value: 800, category: 'around', meldClass: 'B' },
    { id: 'queens-abound', name: 'Queens Abound', value: 600, category: 'around', meldClass: 'B' },
    { id: 'jacks-abound', name: 'Jacks Abound', value: 400, category: 'around', meldClass: 'B' },
  ],
};

const MELD_CLASS_INFO = {
  A: { label: 'Class A', description: 'Marriages, Runs & Dix' },
  B: { label: 'Class B', description: 'Around Melds' },
  C: { label: 'Class C', description: 'Pinochle' },
};

const CARD_POINT_VALUES = [
  { rank: 'A', label: 'Ace', value: 11 },
  { rank: '10', label: 'Ten', value: 10 },
  { rank: 'K', label: 'King', value: 4 },
  { rank: 'Q', label: 'Queen', value: 3 },
  { rank: 'J', label: 'Jack', value: 2 },
];

// Total trick points available per deck type (all cards played through tricks)
const TOTAL_CARD_POINTS = {
  single: 240,
  '64': 240,
  double: 480,
};

// Max cards of each rank per deck type (across all 4 suits)
const CARD_COUNTS_PER_DECK = {
  single: { A: 8, '10': 8, K: 8, Q: 8, J: 8 },
  '64': { A: 8, '10': 8, K: 8, Q: 8, J: 8 },
  double: { A: 16, '10': 16, K: 16, Q: 16, J: 16 },
};

const QUICK_BIDS = [200, 250, 300, 350, 400];

const HOUSE_RULE_PRESETS = {
  standard: {
    label: 'Standard',
    dixScoring: true,
    roundhouseAsMeld: true,
    setPenalty: 'lose-bid',        // 'lose-bid' | 'lose-bid-meld' | 'lose-double-bid'
    lastTrickBonus: 10,
    meldOverrides: {},
  },
  npa: {
    label: 'NPA Rules',
    dixScoring: true,
    roundhouseAsMeld: true,
    setPenalty: 'lose-bid',
    lastTrickBonus: 10,
    meldOverrides: {
      run: 250,
      pinochle: 150,
    },
  },
  custom: {
    label: 'Custom',
    dixScoring: true,
    roundhouseAsMeld: true,
    setPenalty: 'lose-bid',
    lastTrickBonus: 10,
    meldOverrides: {},
  },
};

const PHASES = ['bid', 'meld', 'play', 'score'];
const PHASES_TWO_PLAYER = ['trump', 'meld', 'play', 'score'];

const PHASE_LABELS = {
  bid: 'Bidding',
  trump: 'Trump',
  meld: 'Meld',
  play: 'Tricks',
  score: 'Score',
};

function isTwoPlayerMode() {
  return GameState.state?.config?.playerCount === 2;
}

function isPartnershipMode() {
  return GameState.state?.config?.gameType === 'partnership';
}

function getPhases() {
  return isTwoPlayerMode() ? PHASES_TWO_PLAYER : PHASES;
}

const STORAGE_KEY = 'pinochle-scorer-state';
const THEME_STORAGE_KEY = 'pinochle-scorer-theme';

const Prefs = {
  _prefix: 'pinochle-pref-',
  get(key, defaultVal) {
    const val = localStorage.getItem(this._prefix + key);
    if (val === null) return defaultVal;
    try { return JSON.parse(val); } catch { return val; }
  },
  set(key, val) {
    localStorage.setItem(this._prefix + key, JSON.stringify(val));
  },
};
