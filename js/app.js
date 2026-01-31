const App = {
  init() {
    GameState.init();
    this.initTheme();

    // Check if there's an active game to resume
    if (GameState.hasActiveGame()) {
      this.resumeGame();
    } else {
      this.showSetup();
    }

    this.bindGlobalEvents();
  },

  // ---- Theme ----
  initTheme() {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved);
    }
    this.updateThemeButton();
  },

  toggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');

    let next;
    if (current === 'dark') {
      next = 'light';
    } else if (current === 'light') {
      next = 'dark';
    } else {
      // Auto mode - check what it currently is
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      next = isDark ? 'light' : 'dark';
    }

    html.setAttribute('data-theme', next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
    this.updateThemeButton();
  },

  updateThemeButton() {
    const btn = document.getElementById('btn-theme');
    const theme = document.documentElement.getAttribute('data-theme');
    const isDark = theme === 'dark' ||
      (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    btn.textContent = isDark ? '\u2600' : '\u263E';
  },

  // ---- Global Events ----
  bindGlobalEvents() {
    // Theme toggle
    document.getElementById('btn-theme').addEventListener('click', () => this.toggleTheme());

    // Reset / New Game (header)
    document.getElementById('btn-reset').addEventListener('click', () => {
      if (confirm('Start a new game? Current progress will be lost.')) {
        GameState.clear();
        this.showSetup();
      }
    });

    // Help modal
    document.getElementById('btn-help').addEventListener('click', () => {
      document.getElementById('modal-help').classList.add('active');
    });
    document.getElementById('btn-close-help').addEventListener('click', () => {
      document.getElementById('modal-help').classList.remove('active');
    });

    // Settings modal
    document.getElementById('btn-settings').addEventListener('click', () => {
      document.getElementById('modal-settings').classList.add('active');
    });
    document.getElementById('btn-close-settings').addEventListener('click', () => {
      document.getElementById('modal-settings').classList.remove('active');
    });

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.remove('active');
      });
    });

    // Export
    document.getElementById('btn-export').addEventListener('click', () => this.exportGame());

    // Import
    document.getElementById('btn-import').addEventListener('click', () => {
      document.getElementById('import-file').click();
    });
    document.getElementById('import-file').addEventListener('change', (e) => this.importGame(e));

    // New Game
    document.getElementById('btn-new-game').addEventListener('click', () => {
      if (confirm('Start a new game? Current progress will be lost.')) {
        GameState.clear();
        document.getElementById('modal-settings').classList.remove('active');
        this.showSetup();
      }
    });

    // Bottom bar
    document.getElementById('btn-undo').addEventListener('click', () => this.handleUndo());
    document.getElementById('btn-next-phase').addEventListener('click', () => this.handleNextPhase());

    // History toggle
    document.getElementById('history-toggle').addEventListener('click', () => {
      const content = document.getElementById('history-content');
      const arrow = document.getElementById('history-arrow');
      content.classList.toggle('open');
      arrow.textContent = content.classList.contains('open') ? '\u25B2' : '\u25BC';
    });

    // Setup events
    this.bindSetupEvents();
  },

  // ---- Setup Events ----
  bindSetupEvents() {
    // Player count
    document.getElementById('player-count-grid').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-count]');
      if (!btn) return;

      const count = parseInt(btn.dataset.count);
      document.querySelectorAll('.player-count-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      GameState.updateConfig('playerCount', count);

      // Auto-suggest deck type
      this.autoSuggestDeck(count);

      // Show/hide partnership option
      this.updateGameTypeVisibility(count);

      // Render player name inputs
      UI.renderPlayerNameInputs(count);
    });

    // Deck type
    document.querySelector('#deck-type-section .toggle-group').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-deck]');
      if (!btn) return;
      this.setToggleActive(btn);
      GameState.updateConfig('deckType', btn.dataset.deck);
    });

    // Game type
    document.querySelector('#game-type-section .toggle-group').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-gametype]');
      if (!btn) return;
      this.setToggleActive(btn);
      GameState.updateConfig('gameType', btn.dataset.gametype);

      const partSection = document.getElementById('partnership-section');
      if (btn.dataset.gametype === 'partnership') {
        // Need to set up players first so team assignments can render
        const count = GameState.state.config.playerCount;
        const names = [];
        document.querySelectorAll('.player-name-input').forEach(input => {
          names[parseInt(input.dataset.player)] = input.value.trim() || DEFAULT_PLAYER_NAMES[parseInt(input.dataset.player)];
        });
        GameState.setupPlayers(count, names, 'partnership');
        partSection.classList.remove('hidden');
        UI.renderTeamAssignments();
      } else {
        partSection.classList.add('hidden');
      }
    });

    // Scoring system
    document.querySelector('[data-scoring]')?.closest('.toggle-group')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-scoring]');
      if (!btn) return;
      this.setToggleActive(btn);
      GameState.updateConfig('scoringSystem', btn.dataset.scoring);
    });

    // House rules
    document.getElementById('house-rules-group').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-rules]');
      if (!btn) return;
      this.setToggleActive(btn);
      GameState.updateConfig('houseRules', btn.dataset.rules);

      const customPanel = document.getElementById('custom-rules-panel');
      if (btn.dataset.rules === 'custom') {
        customPanel.classList.remove('hidden');
      } else {
        customPanel.classList.add('hidden');
      }
    });

    // Custom rule toggles
    document.getElementById('rule-dix')?.addEventListener('change', (e) => {
      GameState.updateCustomRule('dixScoring', e.target.checked);
    });
    document.getElementById('rule-roundhouse')?.addEventListener('change', (e) => {
      GameState.updateCustomRule('roundhouseAsMeld', e.target.checked);
    });
    document.getElementById('rule-set-penalty')?.addEventListener('change', (e) => {
      GameState.updateCustomRule('setPenalty', e.target.value);
    });
    document.getElementById('rule-last-trick')?.addEventListener('change', (e) => {
      GameState.updateCustomRule('lastTrickBonus', parseInt(e.target.value));
    });

    // Target score
    document.getElementById('target-score')?.addEventListener('change', (e) => {
      GameState.updateConfig('targetScore', parseInt(e.target.value) || 1000);
    });

    // Start game button
    document.getElementById('btn-start-game').addEventListener('click', () => this.startGame());

    // Initialize player name inputs
    UI.renderPlayerNameInputs(GameState.state.config.playerCount);
  },

  autoSuggestDeck(count) {
    const deckBtns = document.querySelectorAll('[data-deck]');
    const setDeck = (type) => {
      deckBtns.forEach(b => b.classList.toggle('active', b.dataset.deck === type));
      GameState.updateConfig('deckType', type);
    };
    if (count <= 3) {
      setDeck('single');
    } else if (count >= 5) {
      setDeck('double');
    }
    // For 4, leave as user's choice
  },

  updateGameTypeVisibility(count) {
    const gameTypeSection = document.getElementById('game-type-section');
    const partSection = document.getElementById('partnership-section');

    if (count >= 4 && count % 2 === 0) {
      gameTypeSection.classList.remove('hidden');
    } else {
      gameTypeSection.classList.remove('hidden');
      // Reset to individual if odd
      if (count % 2 !== 0) {
        const indBtn = document.querySelector('[data-gametype="individual"]');
        this.setToggleActive(indBtn);
        GameState.updateConfig('gameType', 'individual');
        partSection.classList.add('hidden');
      }
    }
  },

  setToggleActive(btn) {
    btn.parentElement.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  },

  // ---- Start Game ----
  startGame() {
    const count = GameState.state.config.playerCount;

    // Gather player names
    const names = [];
    document.querySelectorAll('.player-name-input').forEach(input => {
      names[parseInt(input.dataset.player)] = input.value.trim() || DEFAULT_PLAYER_NAMES[parseInt(input.dataset.player)];
    });

    GameState.setupPlayers(count, names, GameState.state.config.gameType);

    // Handle team assignments if partnership
    if (GameState.state.config.gameType === 'partnership') {
      document.querySelectorAll('.team-select').forEach(sel => {
        GameState.setPlayerTeam(parseInt(sel.dataset.player), parseInt(sel.value));
      });
    }

    GameState.startNewRound();
    GameState.save();

    UI.selectedMeldPlayer = 0;
    this.showGame();
  },

  // ---- Resume Game ----
  resumeGame() {
    if (!GameState.state.currentRound) {
      // Completed rounds exist but no current round - start a new one
      GameState.startNewRound();
    }
    UI.selectedMeldPlayer = 0;
    this.showGame();
  },

  // ---- Screen Navigation ----
  showSetup() {
    UI.showScreen('screen-setup');
    document.getElementById('bottom-bar').classList.add('hidden');
  },

  showGame() {
    UI.showScreen('screen-game');
    UI.renderGame();
    this.bindGameEvents();
  },

  // ---- Game Events ----
  bindGameEvents() {
    const phaseContent = document.getElementById('phase-content');
    const scoreboard = document.getElementById('scoreboard-inner');

    // Delegate all phase content events
    phaseContent.removeEventListener('click', this._phaseClickHandler);
    this._phaseClickHandler = (e) => this.handlePhaseClick(e);
    phaseContent.addEventListener('click', this._phaseClickHandler);

    // Input events (change/input)
    phaseContent.removeEventListener('change', this._phaseChangeHandler);
    this._phaseChangeHandler = (e) => this.handlePhaseChange(e);
    phaseContent.addEventListener('change', this._phaseChangeHandler);

    // Scoreboard click for player selection in meld phase
    scoreboard.removeEventListener('click', this._scoreboardClickHandler);
    this._scoreboardClickHandler = (e) => {
      const chip = e.target.closest('[data-player]');
      if (chip && GameState.state.currentRound?.phase === 'meld') {
        UI.selectedMeldPlayer = parseInt(chip.dataset.player);
        UI.renderGame();
      }
    };
    scoreboard.addEventListener('click', this._scoreboardClickHandler);

    // Phase stepper clicks
    const stepper = document.getElementById('phase-stepper');
    stepper.removeEventListener('click', this._stepperClickHandler);
    this._stepperClickHandler = (e) => {
      const step = e.target.closest('[data-phase]');
      if (!step) return;
      const targetPhase = step.dataset.phase;
      const phases = getPhases();
      const currentIdx = phases.indexOf(GameState.state.currentRound.phase);
      const targetIdx = phases.indexOf(targetPhase);
      // Only allow going back to completed phases
      if (targetIdx < currentIdx) {
        GameState.setPhase(targetPhase);
        UI.renderGame();
      }
    };
    stepper.addEventListener('click', this._stepperClickHandler);
  },

  handlePhaseClick(e) {
    const target = e.target.closest('button');
    if (!target) return;

    const round = GameState.state.currentRound;
    if (!round) return;

    // Bidder selection
    if (target.dataset.bidder !== undefined) {
      GameState.setBidder(parseInt(target.dataset.bidder));
      UI.renderGame();
    }

    // Quick bid
    if (target.dataset.bid !== undefined) {
      GameState.setBid(parseInt(target.dataset.bid));
      UI.renderGame();
    }

    // Manual bid
    if (target.id === 'btn-set-manual-bid') {
      const input = document.getElementById('manual-bid');
      const val = parseInt(input.value);
      if (val > 0) {
        GameState.setBid(val);
        UI.renderGame();
      }
    }

    // Trump
    if (target.dataset.trump !== undefined) {
      GameState.setTrump(target.dataset.trump);
      UI.renderGame();
    }

    // Meld player tab
    if (target.dataset.meldPlayer !== undefined) {
      UI.selectedMeldPlayer = parseInt(target.dataset.meldPlayer);
      UI.renderGame();
    }

    // Add meld
    if (target.dataset.meldId !== undefined) {
      GameState.addMeld(
        UI.selectedMeldPlayer,
        target.dataset.meldId,
        parseInt(target.dataset.meldValue)
      );
      UI.renderGame();
    }

    // Remove meld
    if (target.dataset.removeMeld !== undefined) {
      GameState.removeMeld(UI.selectedMeldPlayer, parseInt(target.dataset.removeMeld));
      UI.renderGame();
    }

    // Add manual meld
    if (target.id === 'btn-add-manual-meld') {
      const input = document.getElementById('manual-meld');
      const val = parseInt(input.value);
      if (val > 0) {
        GameState.addManualMeld(UI.selectedMeldPlayer, val);
        UI.renderGame();
      }
    }

    // Trick counter buttons
    if (target.dataset.trickAdd !== undefined) {
      const playerId = parseInt(target.dataset.trickAdd);
      const amount = parseInt(target.dataset.amount);
      GameState.addTrickPoints(playerId, amount);
      UI.renderGame();
    }

    // Last trick
    if (target.dataset.lastTrick !== undefined) {
      GameState.setLastTrick(parseInt(target.dataset.lastTrick));
      UI.renderGame();
    }
  },

  handlePhaseChange(e) {
    // Trick point direct input
    if (e.target.dataset.trickPlayer !== undefined) {
      const playerId = parseInt(e.target.dataset.trickPlayer);
      const val = parseInt(e.target.value) || 0;
      GameState.setTrickPoints(playerId, val);
      // Don't full re-render, just save
    }
  },

  // ---- Phase Navigation ----
  handleNextPhase() {
    const round = GameState.state.currentRound;
    if (!round) return;

    const phases = getPhases();
    const currentIdx = phases.indexOf(round.phase);

    if (round.phase === 'trump') {
      // Validate trump phase (2-player)
      if (!round.trump) {
        alert('Please select a trump suit.');
        return;
      }
    }

    if (round.phase === 'bid') {
      // Validate bid phase
      if (round.bidder === null) {
        alert('Please select who won the bid.');
        return;
      }
      if (!round.bid || round.bid <= 0) {
        alert('Please enter a bid amount.');
        return;
      }
      if (!round.trump) {
        alert('Please select a trump suit.');
        return;
      }
    }

    if (round.phase === 'score') {
      // Finalize the round
      GameState.finalizeRound();

      // Check for winner
      const winner = GameState.checkWinner();
      if (winner) {
        this.showWinner(winner);
        return;
      }

      // Start next round
      GameState.startNewRound();
      UI.selectedMeldPlayer = 0;
      UI.renderGame();
      this.bindGameEvents();
      return;
    }

    // Advance to next phase
    const nextPhase = phases[currentIdx + 1];
    GameState.setPhase(nextPhase);
    UI.renderGame();
  },

  handleUndo() {
    if (GameState.undo()) {
      UI.renderGame();
    }
  },

  showWinner(winner) {
    const container = document.getElementById('phase-content');
    container.innerHTML = `
      <div class="winner-banner fade-in">
        <h2>Winner!</h2>
        <div style="font-size:1.25rem; margin-bottom:8px">${winner.name}</div>
        <div class="winner-score">${winner.score}</div>
      </div>
      <div class="round-summary">
        ${this.buildFinalStandingsHTML()}
      </div>
      <button class="btn btn-primary btn-lg mt-16" id="btn-new-game-after-win" style="width:100%">
        New Game
      </button>
    `;

    document.getElementById('btn-new-game-after-win')?.addEventListener('click', () => {
      GameState.clear();
      this.showSetup();
    });

    document.getElementById('bottom-bar').classList.add('hidden');
    UI.renderScoreboard();
    UI.renderHistory();
  },

  buildFinalStandingsHTML() {
    const entities = GameState.getScorableEntities();
    entities.sort((a, b) => b.total - a.total);

    let html = '<h3 class="mb-8">Final Standings</h3>';
    entities.forEach((entity, i) => {
      html += `<div class="score-card">
                <div class="score-card-header">
                  <span class="score-card-name">${i + 1}. ${entity.name}</span>
                  <span style="font-size:1.25rem; font-weight:700">${entity.total}</span>
                </div>
              </div>`;
    });
    return html;
  },

  // ---- Export/Import ----
  exportGame() {
    const data = GameState.exportJSON();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pinochle-game-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    document.getElementById('modal-settings').classList.remove('active');
  },

  importGame(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      if (GameState.importJSON(ev.target.result)) {
        document.getElementById('modal-settings').classList.remove('active');
        if (GameState.hasActiveGame()) {
          this.resumeGame();
        } else {
          this.showSetup();
        }
      } else {
        alert('Invalid game file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  },
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
