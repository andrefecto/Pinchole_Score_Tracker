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
    { id: 'marriage', name: 'Marriage', value: 20, category: 'marriages' },
    { id: 'royal-marriage', name: 'Royal Marriage', value: 40, category: 'marriages' },
    { id: 'run', name: 'Run', value: 150, category: 'runs' },
    { id: 'pinochle', name: 'Pinochle', value: 40, category: 'pinochle' },
    { id: 'dix', name: 'Dix', value: 10, category: 'dix' },
    { id: 'aces-around', name: 'Aces Around', value: 100, category: 'around' },
    { id: 'kings-around', name: 'Kings Around', value: 80, category: 'around' },
    { id: 'queens-around', name: 'Queens Around', value: 60, category: 'around' },
    { id: 'jacks-around', name: 'Jacks Around', value: 40, category: 'around' },
    { id: 'roundhouse', name: 'Roundhouse', value: 240, category: 'special' },
  ],
  npa: [
    { id: 'marriage', name: 'Marriage', value: 20, category: 'marriages' },
    { id: 'royal-marriage', name: 'Royal Marriage', value: 40, category: 'marriages' },
    { id: 'run', name: 'Run', value: 250, category: 'runs' },
    { id: 'pinochle', name: 'Pinochle', value: 150, category: 'pinochle' },
    { id: 'dix', name: 'Dix', value: 10, category: 'dix' },
    { id: 'aces-around', name: 'Aces Around', value: 100, category: 'around' },
    { id: 'kings-around', name: 'Kings Around', value: 80, category: 'around' },
    { id: 'queens-around', name: 'Queens Around', value: 60, category: 'around' },
    { id: 'jacks-around', name: 'Jacks Around', value: 40, category: 'around' },
    { id: 'roundhouse', name: 'Roundhouse', value: 240, category: 'special' },
  ],
};

// Double deck additional melds
const DOUBLE_DECK_MELDS = {
  standard: [
    { id: 'double-pinochle', name: 'Double Pinochle', value: 300, category: 'pinochle' },
    { id: 'triple-pinochle', name: 'Triple Pinochle', value: 600, category: 'pinochle' },
    { id: 'quad-pinochle', name: 'Quad Pinochle', value: 1200, category: 'pinochle' },
    { id: 'double-marriage', name: 'Double Marriage', value: 40, category: 'marriages' },
    { id: 'double-royal-marriage', name: 'Double Royal Marriage', value: 80, category: 'marriages' },
    { id: 'double-run', name: 'Double Run', value: 1500, category: 'runs' },
    { id: 'aces-abound', name: 'Aces Abound', value: 1000, category: 'around' },
    { id: 'kings-abound', name: 'Kings Abound', value: 800, category: 'around' },
    { id: 'queens-abound', name: 'Queens Abound', value: 600, category: 'around' },
    { id: 'jacks-abound', name: 'Jacks Abound', value: 400, category: 'around' },
  ],
  npa: [
    { id: 'double-pinochle', name: 'Double Pinochle', value: 600, category: 'pinochle' },
    { id: 'triple-pinochle', name: 'Triple Pinochle', value: 1200, category: 'pinochle' },
    { id: 'quad-pinochle', name: 'Quad Pinochle', value: 2400, category: 'pinochle' },
    { id: 'double-marriage', name: 'Double Marriage', value: 40, category: 'marriages' },
    { id: 'double-royal-marriage', name: 'Double Royal Marriage', value: 80, category: 'marriages' },
    { id: 'double-run', name: 'Double Run', value: 1500, category: 'runs' },
    { id: 'aces-abound', name: 'Aces Abound', value: 1000, category: 'around' },
    { id: 'kings-abound', name: 'Kings Abound', value: 800, category: 'around' },
    { id: 'queens-abound', name: 'Queens Abound', value: 600, category: 'around' },
    { id: 'jacks-abound', name: 'Jacks Abound', value: 400, category: 'around' },
  ],
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

const PHASE_LABELS = {
  bid: 'Bidding',
  meld: 'Meld',
  play: 'Tricks',
  score: 'Score',
};

const STORAGE_KEY = 'pinochle-scorer-state';
const THEME_STORAGE_KEY = 'pinochle-scorer-theme';
