const GameState = {
  state: null,

  // Initialize a fresh game state
  createDefault() {
    return {
      config: {
        playerCount: 4,
        deckType: 'single',
        scoringSystem: 'classic',
        gameType: 'individual',
        targetScore: 1000,
        houseRules: 'standard',
        customRules: {
          dixScoring: true,
          roundhouseAsMeld: true,
          setPenalty: 'lose-bid',
          lastTrickBonus: 10,
          meldOverrides: {},
        },
        partnerships: [],
      },
      players: [],
      rounds: [],
      currentRound: null,
      totals: [],
      undoStack: [],
    };
  },

  init() {
    const saved = this.load();
    if (saved) {
      this.state = saved;
    } else {
      this.state = this.createDefault();
    }
    return this.state;
  },

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('Failed to save state:', e);
    }
  },

  load() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.warn('Failed to load state:', e);
      return null;
    }
  },

  clear() {
    localStorage.removeItem(STORAGE_KEY);
    this.state = this.createDefault();
  },

  exportJSON() {
    return JSON.stringify(this.state, null, 2);
  },

  importJSON(json) {
    try {
      const data = JSON.parse(json);
      if (data.config && data.players) {
        this.state = data;
        this.save();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  },

  // ---- Setup ----
  updateConfig(key, value) {
    this.state.config[key] = value;
    this.save();
  },

  updateCustomRule(key, value) {
    this.state.config.customRules[key] = value;
    this.save();
  },

  setupPlayers(count, names, gameType) {
    this.state.players = [];
    for (let i = 0; i < count; i++) {
      this.state.players.push({
        id: i,
        name: names[i] || DEFAULT_PLAYER_NAMES[i],
        color: PLAYER_COLORS[i],
        team: null,
      });
    }

    if (gameType === 'partnership') {
      this.autoAssignTeams();
    }

    this.state.totals = this.state.players.map(p => ({
      playerId: p.id,
      total: 0,
    }));

    this.save();
  },

  autoAssignTeams() {
    const count = this.state.players.length;
    if (count % 2 !== 0) return;
    const teamsCount = 2;
    const perTeam = count / teamsCount;

    this.state.config.partnerships = [];
    for (let t = 0; t < teamsCount; t++) {
      const teamPlayers = [];
      for (let p = 0; p < perTeam; p++) {
        const idx = t + p * teamsCount;
        if (idx < count) {
          this.state.players[idx].team = t;
          teamPlayers.push(idx);
        }
      }
      this.state.config.partnerships.push({
        team: t,
        name: `Team ${t + 1}`,
        players: teamPlayers,
      });
    }
  },

  setPlayerTeam(playerId, teamIndex) {
    this.state.players[playerId].team = teamIndex;
    // Rebuild partnerships from player teams
    const teams = {};
    this.state.players.forEach(p => {
      if (p.team !== null) {
        if (!teams[p.team]) teams[p.team] = [];
        teams[p.team].push(p.id);
      }
    });
    this.state.config.partnerships = Object.keys(teams).map(t => ({
      team: parseInt(t),
      name: `Team ${parseInt(t) + 1}`,
      players: teams[t],
    }));
    this.save();
  },

  // ---- Rounds ----
  startNewRound() {
    const roundNumber = this.state.rounds.length + 1;
    this.state.currentRound = {
      roundNumber,
      phase: 'bid',
      bidder: null,
      bid: 0,
      trump: null,
      scores: this.state.players.map(p => ({
        playerId: p.id,
        meld: 0,
        meldItems: [],
        trickPoints: 0,
        total: 0,
        madeBid: null,
      })),
    };
    this.state.undoStack = [];
    this.save();
  },

  setPhase(phase) {
    if (this.state.currentRound) {
      this.state.currentRound.phase = phase;
      this.save();
    }
  },

  // ---- Bidding ----
  setBidder(playerId) {
    this.pushUndo();
    this.state.currentRound.bidder = playerId;
    this.save();
  },

  setBid(amount) {
    this.pushUndo();
    this.state.currentRound.bid = amount;
    this.save();
  },

  setTrump(suit) {
    this.pushUndo();
    this.state.currentRound.trump = suit;
    this.save();
  },

  // ---- Meld ----
  addMeld(playerId, meldType, meldValue) {
    this.pushUndo();
    const score = this.state.currentRound.scores.find(s => s.playerId === playerId);
    if (score) {
      score.meldItems.push({ type: meldType, value: meldValue, id: Date.now() });
      score.meld = score.meldItems.reduce((sum, m) => sum + m.value, 0);
    }
    this.save();
  },

  removeMeld(playerId, meldItemId) {
    this.pushUndo();
    const score = this.state.currentRound.scores.find(s => s.playerId === playerId);
    if (score) {
      score.meldItems = score.meldItems.filter(m => m.id !== meldItemId);
      score.meld = score.meldItems.reduce((sum, m) => sum + m.value, 0);
    }
    this.save();
  },

  addManualMeld(playerId, value) {
    this.pushUndo();
    const score = this.state.currentRound.scores.find(s => s.playerId === playerId);
    if (score) {
      score.meldItems.push({ type: 'manual', value, id: Date.now() });
      score.meld = score.meldItems.reduce((sum, m) => sum + m.value, 0);
    }
    this.save();
  },

  // ---- Tricks ----
  setTrickPoints(playerId, points) {
    this.pushUndo();
    const score = this.state.currentRound.scores.find(s => s.playerId === playerId);
    if (score) {
      score.trickPoints = points;
    }
    this.save();
  },

  addTrickPoints(playerId, amount) {
    this.pushUndo();
    const score = this.state.currentRound.scores.find(s => s.playerId === playerId);
    if (score) {
      score.trickPoints += amount;
    }
    this.save();
  },

  setLastTrick(playerId) {
    this.pushUndo();
    // Remove last trick bonus from all players first
    const bonus = this.getLastTrickBonus();
    this.state.currentRound.scores.forEach(s => {
      s.lastTrick = false;
    });
    const score = this.state.currentRound.scores.find(s => s.playerId === playerId);
    if (score) {
      score.lastTrick = true;
    }
    this.save();
  },

  getLastTrickBonus() {
    const rules = this.state.config.houseRules;
    if (rules === 'custom') {
      return this.state.config.customRules.lastTrickBonus;
    }
    return HOUSE_RULE_PRESETS[rules].lastTrickBonus;
  },

  // ---- Scoring ----
  calculateRoundScores() {
    const round = this.state.currentRound;
    if (!round) return;

    const rules = this.getActiveRules();
    const bonus = this.getLastTrickBonus();

    round.scores.forEach(score => {
      let trickTotal = score.trickPoints;
      if (score.lastTrick) {
        trickTotal += bonus;
      }

      const roundTotal = score.meld + trickTotal;

      // Check if this player is the bidder
      if (score.playerId === round.bidder) {
        if (this.state.config.gameType === 'partnership') {
          // In partnership, team total must meet bid
          const team = this.state.players[score.playerId].team;
          const teamTotal = round.scores
            .filter(s => this.state.players[s.playerId].team === team)
            .reduce((sum, s) => {
              let tt = s.trickPoints;
              if (s.lastTrick) tt += bonus;
              return sum + s.meld + tt;
            }, 0);
          score.madeBid = teamTotal >= round.bid;
        } else {
          score.madeBid = roundTotal >= round.bid;
        }

        if (score.madeBid) {
          score.total = roundTotal;
        } else {
          // Set penalty
          score.total = this.calculateSetPenalty(round.bid, score.meld, rules);
        }
      } else {
        score.total = roundTotal;
      }
    });

    this.save();
  },

  calculateSetPenalty(bid, meld, rules) {
    const penalty = rules.setPenalty;
    switch (penalty) {
      case 'lose-bid-meld':
        return -(bid + meld);
      case 'lose-double-bid':
        return -(bid * 2);
      case 'lose-bid':
      default:
        return -bid;
    }
  },

  getActiveRules() {
    const h = this.state.config.houseRules;
    if (h === 'custom') {
      return this.state.config.customRules;
    }
    return HOUSE_RULE_PRESETS[h];
  },

  finalizeRound() {
    const round = this.state.currentRound;
    if (!round) return;

    // Update totals
    round.scores.forEach(score => {
      const total = this.state.totals.find(t => t.playerId === score.playerId);
      if (total) {
        total.total += score.total;
      }
    });

    // Archive round
    this.state.rounds.push({ ...round });
    this.state.currentRound = null;
    this.save();
  },

  // ---- Winners ----
  checkWinner() {
    const target = this.state.config.targetScore;
    if (this.state.config.gameType === 'partnership') {
      // Check team totals
      const teamTotals = {};
      this.state.totals.forEach(t => {
        const player = this.state.players[t.playerId];
        if (player.team !== null) {
          if (!teamTotals[player.team]) teamTotals[player.team] = 0;
          teamTotals[player.team] += t.total;
        }
      });
      for (const [team, total] of Object.entries(teamTotals)) {
        if (total >= target) {
          const partnership = this.state.config.partnerships.find(p => p.team === parseInt(team));
          return {
            type: 'team',
            team: parseInt(team),
            name: partnership ? partnership.name : `Team ${parseInt(team) + 1}`,
            score: total,
          };
        }
      }
    } else {
      for (const t of this.state.totals) {
        if (t.total >= target) {
          const player = this.state.players[t.playerId];
          return {
            type: 'player',
            playerId: t.playerId,
            name: player.name,
            score: t.total,
          };
        }
      }
    }
    return null;
  },

  // ---- Meld Definitions ----
  getAvailableMelds() {
    const deckType = this.state.config.deckType;
    const rules = this.state.config.houseRules === 'npa' ? 'npa' : 'standard';

    let melds = [...SINGLE_DECK_MELDS[rules]];

    // Apply custom overrides
    if (this.state.config.houseRules === 'custom') {
      const overrides = this.state.config.customRules.meldOverrides || {};
      melds = melds.map(m => ({
        ...m,
        value: overrides[m.id] !== undefined ? overrides[m.id] : m.value,
      }));

      // Filter based on custom rules
      if (!this.state.config.customRules.dixScoring) {
        melds = melds.filter(m => m.id !== 'dix');
      }
      if (!this.state.config.customRules.roundhouseAsMeld) {
        melds = melds.filter(m => m.id !== 'roundhouse');
      }
    } else {
      const preset = HOUSE_RULE_PRESETS[this.state.config.houseRules];
      if (!preset.dixScoring) {
        melds = melds.filter(m => m.id !== 'dix');
      }
      if (!preset.roundhouseAsMeld) {
        melds = melds.filter(m => m.id !== 'roundhouse');
      }
    }

    if (deckType === 'double') {
      const doubleMelds = DOUBLE_DECK_MELDS[rules] || DOUBLE_DECK_MELDS.standard;
      melds = melds.concat(doubleMelds);
    }

    return melds;
  },

  // ---- Undo ----
  pushUndo() {
    if (this.state.currentRound) {
      this.state.undoStack.push(JSON.stringify(this.state.currentRound));
      // Cap undo stack
      if (this.state.undoStack.length > 50) {
        this.state.undoStack.shift();
      }
    }
  },

  undo() {
    if (this.state.undoStack.length > 0) {
      const prev = this.state.undoStack.pop();
      this.state.currentRound = JSON.parse(prev);
      this.save();
      return true;
    }
    return false;
  },

  // ---- Helpers ----
  getPlayerName(playerId) {
    const p = this.state.players[playerId];
    return p ? p.name : `Player ${playerId + 1}`;
  },

  getPlayerColor(playerId) {
    const p = this.state.players[playerId];
    return p ? p.color : '#888';
  },

  getTeamTotal(teamIndex) {
    return this.state.totals
      .filter(t => this.state.players[t.playerId].team === teamIndex)
      .reduce((sum, t) => sum + t.total, 0);
  },

  getScorableEntities() {
    if (this.state.config.gameType === 'partnership') {
      return this.state.config.partnerships.map(p => ({
        id: p.team,
        name: p.name,
        players: p.players,
        total: this.getTeamTotal(p.team),
      }));
    }
    return this.state.players.map(p => ({
      id: p.id,
      name: p.name,
      players: [p.id],
      total: this.state.totals.find(t => t.playerId === p.id)?.total || 0,
    }));
  },

  hasActiveGame() {
    return this.state.players.length > 0 && (this.state.rounds.length > 0 || this.state.currentRound);
  },
};
