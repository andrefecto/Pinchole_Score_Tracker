# Pinochle Score Tracker

**[Play Now](https://andrefecto.github.io/Pinchole_Score_Tracker/)**

A mobile-first, responsive scoring app for the card game Pinochle. Supports 2-8 players with quick-add meld buttons, game phase tracking, configurable house rules, and dark mode.

Built as a static site -- no server required. Works offline once loaded.

## Features

- **2-8 Players** with individual or partnership modes
- **Single & Double Deck** support with appropriate meld sets
- **Quick-Add Meld Buttons** -- tap to add melds, no mental math required
- **Game Phase Tracking** -- Bid, Meld, Tricks, Score with guided flow
- **House Rules** -- Standard, NPA, or fully custom rule presets
- **Dark Mode** -- auto-detects system preference, manual toggle available
- **Persistent State** -- games auto-save to localStorage, survive page refresh
- **Undo Support** -- revert mistakes within the current round
- **Export/Import** -- save and restore game state as JSON
- **Win Detection** -- alerts when a player/team reaches the target score
- **Round History** -- expandable log of all completed rounds

## How to Use

1. Open `index.html` in any modern browser (or visit the GitHub Pages URL)
2. Set up your game: choose player count, deck type, rules, and player names
3. Play through each round:
   - **Bid** -- select the bidder, bid amount, and trump suit
   - **Meld** -- tap meld buttons to add points for each player
   - **Tricks** -- enter trick points earned during play
   - **Score** -- review the round summary and continue
4. First to the target score wins!

## Deploying

This is a pure HTML/CSS/JS static site. To deploy:

- **GitHub Pages**: Push to a repo and enable Pages from the `main` branch
- **Any static host**: Just serve the files as-is

## House Rules

| Rule | Standard | NPA |
|------|----------|-----|
| Run | 150 | 250 |
| Pinochle | 40 | 150 |
| Set Penalty | Lose bid | Lose bid |
| Last Trick | +10 | +10 |

Custom mode lets you toggle individual rules and override meld values.

## Tech Stack

- Vanilla HTML, CSS, JavaScript (no frameworks, no build step)
- Mobile-first responsive design
- CSS custom properties for theming
- localStorage for persistence

## License

MIT License -- see [LICENSE](LICENSE) for details.

---

If you find this useful, consider supporting development:

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow?style=for-the-badge&logo=buy-me-a-coffee)](https://buymeacoffee.com/andrefecto)
