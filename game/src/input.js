// Ember Duel — input: mouse clicks and the keyboard.
// One file, one job: turning clicks and keys into game actions, and nothing else.

import { playCard, endTurn, resolveEnemyTurn, startGame, createGame, SCREEN_PLAY } from './state.js';

/** Wire the stage's buttons and keys to the game. `refresh` re-renders after each action. */
export function bindInput(game, nodes, refresh) {
  const hand = () => document.querySelector('#player-hand');

  hand().addEventListener('click', (event) => {
    const cardEl = event.target.closest('.card');
    if (!cardEl || cardEl.classList.contains('back')) return;
    const cards = [...hand().children];
    const index = cards.indexOf(cardEl);
    if (index < 0) return;
    if (playCard(game, index)) refresh();
  });

  nodes.endTurn.addEventListener('click', () => {
    if (!endTurn(game)) return;
    refresh();
    // Frost acts after a beat, so its cards are seen landing on the table.
    setTimeout(() => {
      resolveEnemyTurn(game);
      refresh();
    }, 900);
  });

  const restart = () => {
    const fresh = createGame((Math.random() * 1000000000) | 0);
    Object.assign(game, fresh);
    refresh();
  };

  document.querySelector('#start-button').addEventListener('click', () => {
    startGame(game);
    refresh();
  });
  document.querySelector('#win-restart').addEventListener('click', restart);
  document.querySelector('#loss-restart').addEventListener('click', restart);

  document.addEventListener('keydown', (event) => {
    if (event.key >= '1' && event.key <= '7') {
      const index = Number(event.key) - 1;
      if (playCard(game, index)) refresh();
      return;
    }
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (game.screen === 'title') {
        startGame(game);
        refresh();
        return;
      }
      if (game.screen === SCREEN_PLAY && game.phase === 'player') {
        if (!endTurn(game)) return;
        refresh();
        setTimeout(() => {
          resolveEnemyTurn(game);
          refresh();
        }, 900);
      }
      return;
    }
    if (event.key === 'r' || event.key === 'R') restart();
  });
}
