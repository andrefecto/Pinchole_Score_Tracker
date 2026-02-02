const UI = {
  selectedMeldPlayer: 0,

  // ---- Scoreboard ----
  renderScoreboard() {
    const container = document.getElementById('scoreboard-inner');
    if (!container) return;

    const isPartnership = GameState.state.config.gameType === 'partnership';
    let html = '';

    if (isPartnership) {
      GameState.state.config.partnerships.forEach(team => {
        const total = GameState.getTeamTotal(team.team);
        const names = team.players.map(id => GameState.getPlayerName(id));
        const abbr = names.map(n => n.substring(0, 3)).join('/');
        const selectedTeam = GameState.getTeamForPlayer(this.selectedMeldPlayer);
        const active = selectedTeam && selectedTeam.team === team.team ? 'active' : '';
        html += `
          <div class="score-chip ${active}" data-team="${team.team}">
            <span class="team-label">${team.name}</span>
            <span class="player-name">${abbr}</span>
            <span class="player-score">${total}</span>
          </div>`;
      });
    } else {
      GameState.state.players.forEach(player => {
        const total = GameState.state.totals.find(t => t.playerId === player.id)?.total || 0;
        const active = this.selectedMeldPlayer === player.id ? 'active' : '';
        html += `
          <div class="score-chip ${active}" data-player="${player.id}"
               style="border-bottom: 3px solid ${player.color}">
            <span class="player-name">${player.name.substring(0, 6)}</span>
            <span class="player-score">${total}</span>
          </div>`;
      });
    }

    container.innerHTML = html;
  },

  // ---- Phase Stepper ----
  renderPhaseStepper() {
    const container = document.getElementById('phase-stepper');
    if (!container) return;

    const phases = getPhases();
    const current = GameState.state.currentRound?.phase || phases[0];
    const currentIdx = phases.indexOf(current);

    let html = '';
    phases.forEach((phase, i) => {
      let cls = '';
      if (i < currentIdx) cls = 'complete';
      else if (i === currentIdx) cls = 'active';

      if (i > 0) {
        html += '<span class="phase-arrow">&#9654;</span>';
      }
      html += `<button class="phase-step ${cls}" data-phase="${phase}">${PHASE_LABELS[phase]}</button>`;
    });

    container.innerHTML = html;
  },

  // ---- Phase Content ----
  renderPhaseContent() {
    const phases = getPhases();
    const phase = GameState.state.currentRound?.phase || phases[0];
    const container = document.getElementById('phase-content');
    if (!container) return;

    switch (phase) {
      case 'bid':
        this.renderBidPhase(container);
        break;
      case 'trump':
        this.renderTrumpPhase(container);
        break;
      case 'meld':
        this.renderMeldPhase(container);
        break;
      case 'play':
        this.renderPlayPhase(container);
        break;
      case 'score':
        this.renderScorePhase(container);
        break;
    }
  },

  // ---- Bid Phase ----
  renderBidPhase(container) {
    const round = GameState.state.currentRound;
    let html = '<div class="fade-in">';

    // Round number
    html += `<h2 class="mb-12">Round ${round.roundNumber} - Bidding</h2>`;

    // Bidder selection
    html += '<h3 class="mb-8">Who won the bid?</h3>';
    html += '<div class="bidder-select-grid">';
    GameState.state.players.forEach(p => {
      const active = round.bidder === p.id ? 'active' : '';
      html += `<button class="bidder-btn ${active}" data-bidder="${p.id}"
                       style="border-left: 4px solid ${p.color}">${p.name}</button>`;
    });
    html += '</div>';

    // Quick bid buttons
    html += '<h3 class="mb-8">Bid Amount</h3>';
    html += '<div class="bid-quick-grid">';
    QUICK_BIDS.forEach(bid => {
      const active = round.bid === bid ? 'active' : '';
      html += `<button class="bid-quick-btn ${active}" data-bid="${bid}">${bid}</button>`;
    });
    html += '</div>';

    // Manual bid
    html += '<div class="bid-manual">';
    html += `<input type="number" id="manual-bid" inputmode="numeric"
                    placeholder="Custom bid" value="${round.bid && !QUICK_BIDS.includes(round.bid) ? round.bid : ''}"
                    min="0" step="10">`;
    html += '<button class="btn btn-primary" id="btn-set-manual-bid">Set</button>';
    html += '</div>';

    // Trump selection
    html += '<h3 class="mb-8">Trump Suit</h3>';
    html += '<div class="trump-grid">';
    SUITS.forEach(suit => {
      const active = round.trump === suit.name ? 'active' : '';
      const colorClass = suit.color === 'red' ? 'suit-red' : 'suit-black';
      html += `<button class="trump-btn ${colorClass} ${active}" data-trump="${suit.name}">${suit.symbol}</button>`;
    });
    html += '</div>';

    html += '</div>';
    container.innerHTML = html;
  },

  // ---- Trump Phase (2-player) ----
  renderTrumpPhase(container) {
    const round = GameState.state.currentRound;
    let html = '<div class="fade-in">';
    html += `<h2 class="mb-12">Round ${round.roundNumber} - Trump</h2>`;
    html += '<h3 class="mb-8">Which suit was turned up?</h3>';
    html += '<div class="trump-grid">';
    SUITS.forEach(suit => {
      const active = round.trump === suit.name ? 'active' : '';
      const colorClass = suit.color === 'red' ? 'suit-red' : 'suit-black';
      html += `<button class="trump-btn ${colorClass} ${active}" data-trump="${suit.name}">${suit.symbol}</button>`;
    });
    html += '</div>';
    html += '</div>';
    container.innerHTML = html;
  },

  // ---- Trump Indicator ----
  renderTrumpIndicator() {
    const round = GameState.state.currentRound;
    if (!round || !round.trump) return '';
    const suit = SUITS.find(s => s.name === round.trump);
    if (!suit) return '';
    const colorClass = suit.color === 'red' ? 'trump-indicator-red' : 'trump-indicator-black';
    return `<div class="trump-indicator ${colorClass}">
              <span class="trump-indicator-symbol">${suit.symbol}</span>
              <span>${suit.name}</span>
            </div>`;
  },

  // ---- Meld Phase ----
  renderMeldPhase(container) {
    if (isSideBySideMeld()) {
      this.renderMeldPhaseSideBySide(container);
    } else {
      this.renderMeldPhaseTabbed(container);
    }
  },

  renderMeldPhaseTabbed(container) {
    const round = GameState.state.currentRound;
    const melds = GameState.getAvailableMelds();
    const playerId = this.selectedMeldPlayer;
    const playerScore = round.scores.find(s => s.playerId === playerId);

    let html = '<div class="fade-in">';
    html += this.renderTrumpIndicator();

    if (isPartnershipMode()) {
      // Team tabs
      html += '<div class="meld-player-tabs">';
      GameState.state.config.partnerships.forEach(team => {
        const primaryId = GameState.getTeamPrimaryPlayer(team.team);
        const selectedTeam = GameState.getTeamForPlayer(playerId);
        const active = selectedTeam && selectedTeam.team === team.team ? 'active' : '';
        const meldTotal = GameState.getTeamMeldTotal(team.team);
        html += `<button class="meld-player-tab ${active}" data-meld-team="${team.team}">
                  ${team.name} (${meldTotal})
                </button>`;
      });
      html += '</div>';

      // Team meld total
      const currentTeam = GameState.getTeamForPlayer(playerId);
      const teamMeldTotal = currentTeam ? GameState.getTeamMeldTotal(currentTeam.team) : 0;
      const teamName = currentTeam ? currentTeam.name : '';
      html += `<div class="meld-total">
                <span>${teamName} Meld: </span>
                <span class="total-value">${teamMeldTotal}</span>
              </div>`;

      // Meld buttons grid
      html += this.renderMeldButtons(melds);

      // Combined team meld items
      if (currentTeam) {
        html += this.renderTeamMeldItemsList(currentTeam.team, melds);
      }
    } else {
      // Player tabs
      html += '<div class="meld-player-tabs">';
      GameState.state.players.forEach(p => {
        const active = playerId === p.id ? 'active' : '';
        const meldTotal = round.scores.find(s => s.playerId === p.id)?.meld || 0;
        html += `<button class="meld-player-tab ${active}" data-meld-player="${p.id}"
                         style="border-bottom: 3px solid ${p.color}">
                  ${p.name} (${meldTotal})
                </button>`;
      });
      html += '</div>';

      // Meld total for selected player
      html += `<div class="meld-total">
                <span>${GameState.getPlayerName(playerId)}'s Meld: </span>
                <span class="total-value">${playerScore?.meld || 0}</span>
              </div>`;

      // Meld buttons grid
      html += this.renderMeldButtons(melds);

      // Added melds list
      html += this.renderMeldItemsList(playerScore, melds);
    }

    // Manual meld entry
    html += '<div class="meld-manual mt-12">';
    html += '<input type="number" id="manual-meld" inputmode="numeric" placeholder="Manual points" min="0">';
    html += '<button class="btn btn-primary" id="btn-add-manual-meld">Add</button>';
    html += '</div>';

    html += '</div>';
    container.innerHTML = html;
  },

  renderMeldPhaseSideBySide(container) {
    const round = GameState.state.currentRound;
    const melds = GameState.getAvailableMelds();
    const playerId = this.selectedMeldPlayer;

    let html = '<div class="fade-in">';
    html += this.renderTrumpIndicator();

    // Two-column layout
    html += '<div class="meld-side-by-side">';
    GameState.state.players.forEach(p => {
      const isActive = playerId === p.id ? 'active' : '';
      const score = round.scores.find(s => s.playerId === p.id);
      html += `<div class="meld-column ${isActive}" data-meld-player="${p.id}"
                    style="border-top: 3px solid ${p.color}">`;
      html += `<div class="meld-column-header">
                <span class="meld-column-name">${p.name}</span>
                <span class="meld-column-total">${score?.meld || 0}</span>
              </div>`;

      // Added melds list
      html += this.renderMeldItemsList(score, melds);

      // Manual meld entry
      html += '<div class="meld-manual mt-12">';
      html += `<input type="number" class="manual-meld-input" data-manual-meld-player="${p.id}"
                      inputmode="numeric" placeholder="Manual pts" min="0">`;
      html += `<button class="btn btn-primary btn-sm" data-add-manual-meld-player="${p.id}">Add</button>`;
      html += '</div>';

      html += '</div>';
    });
    html += '</div>';

    // Shared meld buttons below
    html += this.renderMeldButtons(melds);

    html += '</div>';
    container.innerHTML = html;
  },

  renderMeldItemsList(playerScore, melds) {
    let html = '';
    if (playerScore && playerScore.meldItems.length > 0) {
      html += '<div class="meld-items-list">';
      html += '<h3 class="mb-8">Added Melds</h3>';
      playerScore.meldItems.forEach(item => {
        const meldDef = melds.find(m => m.id === item.type);
        const displayName = item.type === 'manual' ? 'Manual' : (meldDef ? meldDef.name : item.type);
        html += `<div class="meld-item">
                  <span>${displayName} (+${item.value})</span>
                  <button class="meld-item-remove" data-remove-meld="${item.id}"
                          data-remove-meld-player="${playerScore.playerId}">&times;</button>
                </div>`;
      });
      html += '</div>';
    }
    return html;
  },

  renderTeamMeldItemsList(teamIndex, melds) {
    const items = GameState.getTeamMeldItems(teamIndex);
    if (items.length === 0) return '';

    let html = '<div class="meld-items-list">';
    html += '<h3 class="mb-8">Added Melds</h3>';
    items.forEach(item => {
      const meldDef = melds.find(m => m.id === item.type);
      const displayName = item.type === 'manual' ? 'Manual' : (meldDef ? meldDef.name : item.type);
      const playerName = GameState.getPlayerName(item.playerId);
      html += `<div class="meld-item">
                <span>${displayName} (+${item.value}) <small style="color:var(--text-muted)">${playerName}</small></span>
                <button class="meld-item-remove" data-remove-meld="${item.id}"
                        data-remove-meld-player="${item.playerId}">&times;</button>
              </div>`;
    });
    html += '</div>';
    return html;
  },

  // ---- Meld Button Rendering ----
  renderMeldButtons(melds) {
    if (isTwoPlayerMode()) {
      return this.renderMeldButtonsGrouped(melds);
    }
    return this.renderMeldButtonsFlat(melds);
  },

  renderMeldButtonsFlat(melds) {
    let html = '<div class="meld-grid">';
    melds.forEach(meld => {
      html += `<button class="meld-btn" data-meld-id="${meld.id}" data-meld-value="${meld.value}">
                <span>${meld.name}</span>
                <span class="meld-value">+${meld.value}</span>
              </button>`;
    });
    html += '</div>';
    return html;
  },

  renderMeldButtonsGrouped(melds) {
    let html = '';
    html += `<div class="meld-class-hint">
              <strong>Meld Classes:</strong> In 2-player Pinochle, each player may only meld from
              one class (A, B, or C) per round, plus Roundhouse.
            </div>`;

    const classes = ['A', 'B', 'C'];
    classes.forEach(cls => {
      const classInfo = MELD_CLASS_INFO[cls];
      const classMelds = melds.filter(m => m.meldClass === cls);
      if (classMelds.length === 0) return;

      html += '<div class="meld-class-group">';
      html += `<div class="meld-class-label">${classInfo.label} — ${classInfo.description}</div>`;
      html += '<div class="meld-grid">';
      classMelds.forEach(meld => {
        html += `<button class="meld-btn" data-meld-id="${meld.id}" data-meld-value="${meld.value}">
                  <span>${meld.name}</span>
                  <span class="meld-value">+${meld.value}</span>
                </button>`;
      });
      html += '</div>';
      html += '</div>';
    });

    // Ungrouped melds (e.g. roundhouse with meldClass: null)
    const ungrouped = melds.filter(m => m.meldClass === null || m.meldClass === undefined);
    if (ungrouped.length > 0) {
      html += '<div class="meld-class-group">';
      html += '<div class="meld-grid">';
      ungrouped.forEach(meld => {
        html += `<button class="meld-btn" data-meld-id="${meld.id}" data-meld-value="${meld.value}">
                  <span>${meld.name}</span>
                  <span class="meld-value">+${meld.value}</span>
                </button>`;
      });
      html += '</div>';
      html += '</div>';
    }

    return html;
  },

  // ---- Play Phase ----
  renderPlayPhase(container) {
    const round = GameState.state.currentRound;
    const bonus = GameState.getLastTrickBonus();
    const twoPlayer = isTwoPlayerMode();
    const partnership = isPartnershipMode();

    let html = '<div class="fade-in">';
    html += `<h2 class="mb-12">Round ${round.roundNumber} - Trick Points</h2>`;
    html += this.renderTrumpIndicator();

    // Trick point inputs
    html += '<div class="trick-input-list">';

    if (partnership) {
      // Partnership: show 2 team rows, each using primary player's ID
      GameState.state.config.partnerships.forEach(team => {
        const primaryId = GameState.getTeamPrimaryPlayer(team.team);
        const score = round.scores.find(s => s.playerId === primaryId);
        const isBidderTeam = team.players.includes(round.bidder);
        const cardCountActive = score?.cardCounts !== null && score?.cardCounts !== undefined;

        html += `<div class="trick-input-row">
                  <span class="trick-player-name">${team.name}${isBidderTeam ? ' *' : ''}</span>
                  <input type="number" inputmode="numeric" data-trick-player="${primaryId}"
                         value="${score?.trickPoints || 0}" min="0" step="1"
                         ${cardCountActive ? 'readonly' : ''}>
                  <div class="trick-counter-btns">
                    <button class="trick-counter-btn trick-minus" data-trick-add="${primaryId}" data-amount="-10" ${cardCountActive ? 'disabled' : ''}>-10</button>
                    <button class="trick-counter-btn trick-minus" data-trick-add="${primaryId}" data-amount="-5" ${cardCountActive ? 'disabled' : ''}>-5</button>
                    <button class="trick-counter-btn trick-minus" data-trick-add="${primaryId}" data-amount="-1" ${cardCountActive ? 'disabled' : ''}>-1</button>
                    <button class="trick-counter-btn trick-plus" data-trick-add="${primaryId}" data-amount="1" ${cardCountActive ? 'disabled' : ''}>+1</button>
                    <button class="trick-counter-btn trick-plus" data-trick-add="${primaryId}" data-amount="5" ${cardCountActive ? 'disabled' : ''}>+5</button>
                    <button class="trick-counter-btn trick-plus" data-trick-add="${primaryId}" data-amount="10" ${cardCountActive ? 'disabled' : ''}>+10</button>
                  </div>
                </div>`;
      });
    } else {
      GameState.state.players.forEach(p => {
        const score = round.scores.find(s => s.playerId === p.id);
        const isBidder = !twoPlayer && round.bidder === p.id;
        const cardCountActive = score?.cardCounts !== null && score?.cardCounts !== undefined;

        html += `<div class="trick-input-row" style="border-left: 4px solid ${p.color}">
                  <span class="trick-player-name">${p.name}${isBidder ? ' *' : ''}</span>
                  <input type="number" inputmode="numeric" data-trick-player="${p.id}"
                         value="${score?.trickPoints || 0}" min="0" step="1"
                         ${cardCountActive ? 'readonly' : ''}>
                  <div class="trick-counter-btns">
                    <button class="trick-counter-btn trick-minus" data-trick-add="${p.id}" data-amount="-10" ${cardCountActive ? 'disabled' : ''}>-10</button>
                    <button class="trick-counter-btn trick-minus" data-trick-add="${p.id}" data-amount="-5" ${cardCountActive ? 'disabled' : ''}>-5</button>
                    <button class="trick-counter-btn trick-minus" data-trick-add="${p.id}" data-amount="-1" ${cardCountActive ? 'disabled' : ''}>-1</button>
                    <button class="trick-counter-btn trick-plus" data-trick-add="${p.id}" data-amount="1" ${cardCountActive ? 'disabled' : ''}>+1</button>
                    <button class="trick-counter-btn trick-plus" data-trick-add="${p.id}" data-amount="5" ${cardCountActive ? 'disabled' : ''}>+5</button>
                    <button class="trick-counter-btn trick-plus" data-trick-add="${p.id}" data-amount="10" ${cardCountActive ? 'disabled' : ''}>+10</button>
                  </div>
                </div>`;

        // Card count section (2-player only)
        if (twoPlayer) {
          html += `<div class="card-count-section">`;
          if (!cardCountActive) {
            html += `<button class="btn btn-secondary btn-sm" data-toggle-cards="${p.id}">Count Cards</button>`;
          } else {
            html += `<button class="btn btn-secondary btn-sm" data-toggle-cards="${p.id}">Switch to Manual</button>`;
            html += '<div class="card-count-grid">';
            CARD_POINT_VALUES.forEach(card => {
              const count = score.cardCounts[card.rank] || 0;
              const subtotal = count * card.value;
              html += `<div class="card-count-row">
                        <span class="card-count-rank">${card.label}</span>
                        <span class="card-count-value">${card.value} pts</span>
                        <button class="card-count-btn" data-card-delta="${p.id}" data-rank="${card.rank}" data-delta="-1">-</button>
                        <span class="card-count-num">${count}</span>
                        <button class="card-count-btn" data-card-delta="${p.id}" data-rank="${card.rank}" data-delta="1">+</button>
                        <span class="card-count-subtotal">${subtotal}</span>
                      </div>`;
            });
            html += '</div>';
            html += `<div class="card-count-total">Total: ${score.trickPoints}</div>`;
          }
          html += '</div>';
        }
      });
    }
    html += '</div>';

    // Last trick
    if (bonus > 0) {
      html += '<div class="last-trick-section">';
      html += `<h3>Last Trick (+${bonus})</h3>`;
      html += '<div class="last-trick-grid">';
      if (partnership) {
        GameState.state.config.partnerships.forEach(team => {
          const primaryId = GameState.getTeamPrimaryPlayer(team.team);
          const score = round.scores.find(s => s.playerId === primaryId);
          const active = score?.lastTrick ? 'active' : '';
          html += `<button class="last-trick-btn ${active}" data-last-trick="${primaryId}">${team.name}</button>`;
        });
      } else {
        GameState.state.players.forEach(p => {
          const score = round.scores.find(s => s.playerId === p.id);
          const active = score?.lastTrick ? 'active' : '';
          html += `<button class="last-trick-btn ${active}" data-last-trick="${p.id}">${p.name}</button>`;
        });
      }
      html += '</div>';
      html += '</div>';
    }

    html += '</div>';
    container.innerHTML = html;
  },

  // ---- Score Phase ----
  renderScorePhase(container) {
    const round = GameState.state.currentRound;
    const bonus = GameState.getLastTrickBonus();

    // Calculate scores first
    GameState.calculateRoundScores();

    let html = '<div class="fade-in">';

    html += `<h2 class="mb-12">Round ${round.roundNumber} - Summary</h2>`;
    html += this.renderTrumpIndicator();

    // Score cards
    html += '<div class="round-summary">';

    if (isPartnershipMode()) {
      GameState.state.config.partnerships.forEach(team => {
        const teamMeld = GameState.getTeamMeldTotal(team.team);
        const teamTricks = GameState.getTeamTrickPoints(team.team);
        const teamRoundTotal = team.players.reduce((sum, pid) => {
          const s = round.scores.find(sc => sc.playerId === pid);
          return sum + (s ? s.total : 0);
        }, 0);
        const isBidderTeam = team.players.includes(round.bidder);
        const bidderScore = round.scores.find(s => s.playerId === round.bidder);
        const bidderName = GameState.getPlayerName(round.bidder);

        let cardClass = '';
        let badge = '';
        if (isBidderTeam && bidderScore) {
          if (bidderScore.madeBid === false) {
            cardClass = 'set';
            badge = '<span class="score-card-badge badge-set">SET</span>';
          } else if (bidderScore.madeBid === true) {
            cardClass = 'made-bid';
            badge = '<span class="score-card-badge badge-made">Made</span>';
          }
          cardClass += ' bidder';
        }

        const runningTotal = GameState.getTeamTotal(team.team) + teamRoundTotal;

        html += `<div class="score-card ${cardClass}">
                  <div class="score-card-header">
                    <span class="score-card-name">${team.name}</span>
                    <div>
                      ${isBidderTeam ? '<span class="score-card-badge badge-bidder">' + bidderName + ' (' + round.bid + ')</span> ' : ''}
                      ${badge}
                    </div>
                  </div>
                  <div class="score-breakdown">
                    <div class="score-breakdown-item">
                      <div class="score-breakdown-label">Meld</div>
                      <div class="score-breakdown-value">${teamMeld}</div>
                    </div>
                    <div class="score-breakdown-item">
                      <div class="score-breakdown-label">Tricks</div>
                      <div class="score-breakdown-value">${teamTricks}</div>
                    </div>
                    <div class="score-breakdown-item">
                      <div class="score-breakdown-label">Round</div>
                      <div class="score-breakdown-value ${teamRoundTotal < 0 ? 'negative' : ''}">${teamRoundTotal}</div>
                    </div>
                  </div>
                  <div class="round-total">
                    Running: ${runningTotal}
                  </div>
                </div>`;
      });
    } else {
      GameState.state.players.forEach(p => {
        const score = round.scores.find(s => s.playerId === p.id);
        const isBidder = !isTwoPlayerMode() && round.bidder === p.id;
        let cardClass = '';
        let badge = '';

        if (isBidder) {
          if (score.madeBid === false) {
            cardClass = 'set';
            badge = '<span class="score-card-badge badge-set">SET</span>';
          } else if (score.madeBid === true) {
            cardClass = 'made-bid';
            badge = '<span class="score-card-badge badge-made">Made</span>';
          }
          cardClass += ' bidder';
        }

        let trickTotal = score.trickPoints;
        if (score.lastTrick) trickTotal += bonus;

        html += `<div class="score-card ${cardClass}" style="border-left-color: ${isBidder ? '' : p.color}">
                  <div class="score-card-header">
                    <span class="score-card-name">${p.name}</span>
                    <div>
                      ${isBidder ? '<span class="score-card-badge badge-bidder">Bidder (' + round.bid + ')</span> ' : ''}
                      ${badge}
                    </div>
                  </div>
                  <div class="score-breakdown">
                    <div class="score-breakdown-item">
                      <div class="score-breakdown-label">Meld</div>
                      <div class="score-breakdown-value">${score.meld}</div>
                    </div>
                    <div class="score-breakdown-item">
                      <div class="score-breakdown-label">Tricks</div>
                      <div class="score-breakdown-value">${trickTotal}</div>
                    </div>
                    <div class="score-breakdown-item">
                      <div class="score-breakdown-label">Round</div>
                      <div class="score-breakdown-value ${score.total < 0 ? 'negative' : ''}">${score.total}</div>
                    </div>
                  </div>
                  <div class="round-total">
                    Running: ${(GameState.state.totals.find(t => t.playerId === p.id)?.total || 0) + score.total}
                  </div>
                </div>`;
      });
    }
    html += '</div>';

    html += '</div>';
    container.innerHTML = html;
  },

  // ---- History ----
  renderHistory() {
    const container = document.getElementById('history-content');
    if (!container) return;

    if (GameState.state.rounds.length === 0) {
      container.innerHTML = '<p style="padding:12px; color:var(--text-muted)">No completed rounds yet.</p>';
      return;
    }

    let html = '';
    const partnership = isPartnershipMode();

    GameState.state.rounds.slice().reverse().forEach(round => {
      const isTwoPlayer = GameState.state.config.playerCount === 2;
      const roundInfo = isTwoPlayer
        ? `Trump: ${round.trump || '?'}`
        : `Bid: ${GameState.getPlayerName(round.bidder)} - ${round.bid} (${round.trump || '?'})`;
      html += `<div class="history-round">
                <div class="history-round-header">
                  <span>Round ${round.roundNumber}</span>
                  <span>${roundInfo}</span>
                </div>
                <div class="history-scores">`;

      if (partnership) {
        GameState.state.config.partnerships.forEach(team => {
          const teamTotal = team.players.reduce((sum, pid) => {
            const s = round.scores.find(sc => sc.playerId === pid);
            return sum + (s ? s.total : 0);
          }, 0);
          const bidderScore = round.scores.find(s => s.playerId === round.bidder);
          const isBidderTeam = team.players.includes(round.bidder);
          const set = isBidderTeam && bidderScore && bidderScore.madeBid === false ? ' SET' : '';
          html += `<span class="history-score-item">${team.name}: ${teamTotal > 0 ? '+' : ''}${teamTotal}${set}</span>`;
        });
      } else {
        round.scores.forEach(s => {
          const name = GameState.getPlayerName(s.playerId);
          const set = s.madeBid === false ? ' SET' : '';
          html += `<span class="history-score-item">${name}: ${s.total > 0 ? '+' : ''}${s.total}${set}</span>`;
        });
      }
      html += '</div></div>';
    });

    container.innerHTML = html;
  },

  // ---- Setup Screen ----
  renderPlayerNameInputs(count) {
    const container = document.getElementById('player-names-list');
    if (!container) return;

    let html = '';
    for (let i = 0; i < count; i++) {
      const name = GameState.state.players[i]?.name || DEFAULT_PLAYER_NAMES[i];
      html += `<div class="player-entry">
                <div class="color-dot" style="background: ${PLAYER_COLORS[i]}"></div>
                <input type="text" class="player-name-input" data-player="${i}"
                       value="${name}" placeholder="${DEFAULT_PLAYER_NAMES[i]}">
              </div>`;
    }
    container.innerHTML = html;
  },

  renderTeamAssignments() {
    const container = document.getElementById('team-assignments');
    if (!container) return;

    const count = GameState.state.config.playerCount;
    if (count % 2 !== 0) {
      container.innerHTML = '<p>Partnership requires an even number of players.</p>';
      return;
    }

    let html = '';
    for (let i = 0; i < count; i++) {
      const currentTeam = GameState.state.players[i]?.team;
      html += `<div class="player-entry">
                <div class="color-dot" style="background: ${PLAYER_COLORS[i]}"></div>
                <span style="flex:1; font-weight:500">${GameState.state.players[i]?.name || DEFAULT_PLAYER_NAMES[i]}</span>
                <select class="team-select" data-player="${i}" style="width:100px">
                  <option value="0" ${currentTeam === 0 ? 'selected' : ''}>Team 1</option>
                  <option value="1" ${currentTeam === 1 ? 'selected' : ''}>Team 2</option>
                </select>
              </div>`;
    }
    container.innerHTML = html;
  },

  // ---- Bottom Bar ----
  updateBottomBar() {
    const bar = document.getElementById('bottom-bar');
    const nextBtn = document.getElementById('btn-next-phase');
    const undoBtn = document.getElementById('btn-undo');

    if (!GameState.state.currentRound) {
      bar.classList.add('hidden');
      return;
    }

    bar.classList.remove('hidden');
    const phase = GameState.state.currentRound.phase;
    const phases = getPhases();
    const phaseIdx = phases.indexOf(phase);

    if (phase === 'score') {
      nextBtn.textContent = 'Finish Round';
    } else {
      nextBtn.innerHTML = 'Next Phase &rarr;';
    }

    undoBtn.disabled = GameState.state.undoStack.length === 0;
  },

  // ---- Full Render ----
  renderGame() {
    this.renderScoreboard();
    this.renderPhaseStepper();
    this.renderPhaseContent();
    this.renderHistory();
    this.updateBottomBar();
  },

  showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById(screenId);
    if (screen) screen.classList.add('active');
  },
};
