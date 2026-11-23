// Ember Duel — the screenshot scenes behind ?shot=title|play|win|loss&seed=N.
// One file, one job: staging one exact, deterministic frame per name, using the
// real rules (never a mock), so a screenshot is what a short game really looks like.

import { CARDS } from './config.js';
import {
  SCREEN_LOSS, SCREEN_PLAY, SCREEN_WIN, checkEnd, createGame, dealDamage,
  endTurn, playCard, resolveEnemyTurn, startGame,
} from './state.js';

/** The scene's name from the URL (?shot=...), defaulting to the title. */
export function shotName() {
  const name = new URLSearchParams(window.location.search).get('shot') || 'title';
  return ['title', 'play', 'win', 'loss'].includes(name) ? name : 'title';
}

/** The scene's seed from the URL (?seed=...), defaulting to 1. */
export function shotSeed() {
  const raw = Number(new URLSearchParams(window.location.search).get('seed') || '1');
  return Number.isFinite(raw) ? raw : 1;
}

/** Play a single card: the cheapest affordable attack, else the first affordable card. */
function playOneCard(game) {
  const hand = game.player.hand;
  let best = -1;
  let bestCost = Infinity;
  for (let i = 0; i < hand.length; i += 1) {
    const def = CARDS[hand[i].id];
    if (def.cost > game.player.energy) continue;
    if (def.effect.damage && def.cost < bestCost) {
      best = i;
      bestCost = def.cost;
    }
  }
  if (best < 0) {
    for (let i = 0; i < hand.length; i += 1) {
      if (CARDS[hand[i].id].cost <= game.player.energy) {
        best = i;
        break;
      }
    }
  }
  if (best < 0) return false;
  return playCard(game, best);
}

/** Play the cheapest playable attack, else the first playable card, until none is affordable. */
function playWhatYouCan(game) {
  for (;;) {
    if (!playOneCard(game)) return;
    if (game.screen !== SCREEN_PLAY) return;
  }
}

/** Play at most `n` cards, the cheapest attacks first. */
function playUpTo(game, n) {
  for (let i = 0; i < n; i += 1) {
    if (!playOneCard(game)) return;
    if (game.screen !== SCREEN_PLAY) return;
  }
}

/** Set `game` to the named scene and return it. Every scene is deterministic for its seed. */
export function stageShot(name, seed) {
  const game = createGame(seed);
  if (name === 'title') {
    return game; // Fresh game on the title screen.
  }
  startGame(game);
  if (name === 'play') {
    // Turn 1: strike once, let Frost answer, then turn 2 with one card
    // on the table and a hand left to play, so the frame shows the whole game.
    playUpTo(game, 1);
    endTurn(game);
    resolveEnemyTurn(game);
    if (game.screen !== SCREEN_PLAY) return game;
    playOneCard(game);
    return game;
  }
  if (name === 'win') {
    // Play on until Frost falls, then leave the winning table in place.
    for (let guard = 0; guard < 40 && game.screen === SCREEN_PLAY; guard += 1) {
      playWhatYouCan(game);
      if (game.screen !== SCREEN_PLAY) break;
      endTurn(game);
      resolveEnemyTurn(game);
      if (game.screen !== SCREEN_PLAY) break;
    }
    if (game.screen === SCREEN_PLAY) {
      // A long game that never ended: finish it honestly through damage.
      dealDamage(game.enemy, game.enemy.life);
      checkEnd(game);
    }
    return game;
  }
  // loss: Ember fights for three turns, then stops answering, and Frost wears it down.
  for (let guard = 0; guard < 40 && game.screen === SCREEN_PLAY; guard += 1) {
    if (game.turn <= 3) playWhatYouCan(game);
    if (game.screen !== SCREEN_PLAY) break;
    endTurn(game);
    resolveEnemyTurn(game);
    if (game.screen !== SCREEN_PLAY) break;
  }
  if (game.screen === SCREEN_PLAY) {
    dealDamage(game.player, game.player.life);
    checkEnd(game);
  }
  return game;
}
