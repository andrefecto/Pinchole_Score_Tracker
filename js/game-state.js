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
    this.pushUndo();
    const roundNumber = this.state.rounds.length + 1;
    this.state.currentRound = {
      roundNumber,
      phase: isTwoPlayerMode() ? 'trump' : 'bid',
      bidder: null,
      bid: 0,
      trump: null,
      scores: this.state.players.map(p => ({
        playerId: p.id,
        meld: 0,
        meldItems: [],
        trickPoints: 0,
        cardCounts: null,
        total: 0,
        madeBid: null,
      })),
    };
    this.save();
  },

  setPhase(phase) {
    if (this.state.currentRound) {
      this.pushUndo();
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
      score.cardCounts = null;
    }
    this.save();
  },

  addTrickPoints(playerId, amount) {
    this.pushUndo();
    const score = this.state.currentRound.scores.find(s => s.playerId === playerId);
    if (score) {
      score.trickPoints = Math.max(0, score.trickPoints + amount);
      score.cardCounts = null;
    }
    this.save();
  },

  setCardCount(playerId, rank, count) {
    this.pushUndo();
    const score = this.state.currentRound.scores.find(s => s.playerId === playerId);
    if (score && score.cardCounts) {
      score.cardCounts[rank] = Math.max(0, count);
      score.trickPoints = this.calculateTrickPointsFromCards(score.cardCounts);
    }
    this.save();
  },

  addCardCount(playerId, rank, delta) {
    this.pushUndo();
    const score = this.state.currentRound.scores.find(s => s.playerId === playerId);
    if (score && score.cardCounts) {
      score.cardCounts[rank] = Math.max(0, (score.cardCounts[rank] || 0) + delta);
      score.trickPoints = this.calculateTrickPointsFromCards(score.cardCounts);
    }
    this.save();
  },

  calculateTrickPointsFromCards(cardCounts) {
    if (!cardCounts) return 0;
    return CARD_POINT_VALUES.reduce((sum, card) => {
      return sum + (cardCounts[card.rank] || 0) * card.value;
    }, 0);
  },

  toggleCardCounts(playerId) {
    this.pushUndo();
    const score = this.state.currentRound.scores.find(s => s.playerId === playerId);
    if (score) {
      if (score.cardCounts) {
        // Switching to manual — save current card counts, keep trickPoints
        score._savedCardCounts = { ...score.cardCounts };
        score.cardCounts = null;
      } else {
        // Switching to card counting — restore saved counts if available
        if (score._savedCardCounts) {
          score.cardCounts = { ...score._savedCardCounts };
          score.trickPoints = this.calculateTrickPointsFromCards(score.cardCounts);
        } else {
          score.cardCounts = {};
          CARD_POINT_VALUES.forEach(c => { score.cardCounts[c.rank] = 0; });
          score.trickPoints = 0;
        }
      }
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

      if (isTwoPlayerMode()) {
        // 2-player: no bidder, no set logic -- simple total
        score.total = roundTotal;
      } else if (score.playerId === round.bidder) {
        // Check if this player is the bidder
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

    // Partnership SET fix: when bidder is SET, zero out all teammates' totals
    if (this.state.config.gameType === 'partnership' && !isTwoPlayerMode()) {
      const bidderScore = round.scores.find(s => s.playerId === round.bidder);
      if (bidderScore && bidderScore.madeBid === false) {
        const bidderTeam = this.state.players[round.bidder].team;
        round.scores.forEach(score => {
          if (score.playerId !== round.bidder &&
              this.state.players[score.playerId].team === bidderTeam) {
            score.total = 0;
          }
        });
      }
    }

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

    this.pushUndo();

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

      const winningTeams = Object.entries(teamTotals).filter(([, total]) => total >= target);

      if (winningTeams.length === 0) return null;

      // If bidder's team is among winners, bidder's team wins
      const lastRound = this.state.rounds[this.state.rounds.length - 1];
      if (lastRound && lastRound.bidder !== null) {
        const bidderTeam = this.state.players[lastRound.bidder].team;
        const bidderTeamEntry = winningTeams.find(([team]) => parseInt(team) === bidderTeam);
        if (bidderTeamEntry) {
          const partnership = this.state.config.partnerships.find(p => p.team === bidderTeam);
          return {
            type: 'team',
            team: bidderTeam,
            name: partnership ? partnership.name : `Team ${bidderTeam + 1}`,
            score: bidderTeamEntry[1],
          };
        }
      }

      // Otherwise highest team score wins
      winningTeams.sort((a, b) => b[1] - a[1]);
      const [team, total] = winningTeams[0];
      const partnership = this.state.config.partnerships.find(p => p.team === parseInt(team));
      return {
        type: 'team',
        team: parseInt(team),
        name: partnership ? partnership.name : `Team ${parseInt(team) + 1}`,
        score: total,
      };
    }

    // Individual mode
    const winners = this.state.totals.filter(t => t.total >= target);
    if (winners.length === 0) return null;

    if (isTwoPlayerMode()) {
      // 2-player: if both reach target, extend by 250
      if (winners.length >= 2) {
        this.state.config.targetScore += 250;
        this.save();
        return { type: 'extended', newTarget: this.state.config.targetScore };
      }
      // Exactly one winner
      const player = this.state.players[winners[0].playerId];
      return {
        type: 'player',
        playerId: winners[0].playerId,
        name: player.name,
        score: winners[0].total,
      };
    }

    // 3+ player individual: bidder wins ties
    const lastRound = this.state.rounds[this.state.rounds.length - 1];
    if (lastRound && lastRound.bidder !== null && winners.length > 1) {
      const bidderWinner = winners.find(w => w.playerId === lastRound.bidder);
      if (bidderWinner) {
        const player = this.state.players[bidderWinner.playerId];
        return {
          type: 'player',
          playerId: bidderWinner.playerId,
          name: player.name,
          score: bidderWinner.total,
        };
      }
    }

    // Highest score wins
    winners.sort((a, b) => b.total - a.total);
    const player = this.state.players[winners[0].playerId];
    return {
      type: 'player',
      playerId: winners[0].playerId,
      name: player.name,
      score: winners[0].total,
    };
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
      // Double deck has no 9s, so Dix is never available
      melds = melds.filter(m => m.id !== 'dix');
      const doubleMelds = DOUBLE_DECK_MELDS[rules] || DOUBLE_DECK_MELDS.standard;
      melds = melds.concat(doubleMelds);
    }

    return melds;
  },

  // ---- Undo ----
  pushUndo() {
    const snapshot = {
      currentRound: this.state.currentRound ? JSON.parse(JSON.stringify(this.state.currentRound)) : null,
      totals: JSON.parse(JSON.stringify(this.state.totals)),
      rounds: JSON.parse(JSON.stringify(this.state.rounds)),
    };
    this.state.undoStack.push(snapshot);
    // Cap undo stack
    if (this.state.undoStack.length > 50) {
      this.state.undoStack.shift();
    }
  },

  undo() {
    if (this.state.undoStack.length > 0) {
      const prev = this.state.undoStack.pop();
      this.state.currentRound = prev.currentRound;
      this.state.totals = prev.totals;
      this.state.rounds = prev.rounds;
      this.save();
      return true;
    }
    return false;
  },

  // ---- Auto-fill (2-player) ----
  autoFillOtherPlayerCards(knownPlayerId) {
    if (!isTwoPlayerMode()) return false;
    const round = this.state.currentRound;
    if (!round) return false;

    const knownScore = round.scores.find(s => s.playerId === knownPlayerId);
    if (!knownScore || !knownScore.cardCounts) return false;

    const otherScore = round.scores.find(s => s.playerId !== knownPlayerId);
    if (!otherScore) return false;

    this.pushUndo();

    const deckType = this.state.config.deckType;
    const maxCounts = CARD_COUNTS_PER_DECK[deckType];

    // Initialize card counts for other player if needed
    if (!otherScore.cardCounts) {
      otherScore.cardCounts = {};
    }

    CARD_POINT_VALUES.forEach(card => {
      const knownCount = knownScore.cardCounts[card.rank] || 0;
      otherScore.cardCounts[card.rank] = (maxCounts[card.rank] || 0) - knownCount;
    });

    otherScore.trickPoints = this.calculateTrickPointsFromCards(otherScore.cardCounts);
    this.save();
    return true;
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

  getTeamPrimaryPlayer(teamIndex) {
    const partnership = this.state.config.partnerships[teamIndex];
    return partnership ? partnership.players[0] : null;
  },

  getTeamForPlayer(playerId) {
    return this.state.config.partnerships.find(p => p.players.includes(playerId));
  },

  getTeamMeldTotal(teamIndex) {
    const round = this.state.currentRound;
    if (!round) return 0;
    const partnership = this.state.config.partnerships[teamIndex];
    if (!partnership) return 0;
    return partnership.players.reduce((sum, pid) => {
      const score = round.scores.find(s => s.playerId === pid);
      return sum + (score?.meld || 0);
    }, 0);
  },

  getTeamMeldItems(teamIndex) {
    const round = this.state.currentRound;
    if (!round) return [];
    const partnership = this.state.config.partnerships[teamIndex];
    if (!partnership) return [];
    const items = [];
    partnership.players.forEach(pid => {
      const score = round.scores.find(s => s.playerId === pid);
      if (score) {
        score.meldItems.forEach(item => {
          items.push({ ...item, playerId: pid });
        });
      }
    });
    return items;
  },

  getTeamTrickPoints(teamIndex) {
    const round = this.state.currentRound;
    if (!round) return 0;
    const partnership = this.state.config.partnerships[teamIndex];
    if (!partnership) return 0;
    const bonus = this.getLastTrickBonus();
    return partnership.players.reduce((sum, pid) => {
      const score = round.scores.find(s => s.playerId === pid);
      if (!score) return sum;
      let tp = score.trickPoints;
      if (score.lastTrick) tp += bonus;
      return sum + tp;
    }, 0);
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
