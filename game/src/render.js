// Ember Duel — the table: drawing the game as DOM.
// One file, one job: turning a game state into the visible table, and only that.
// Cards are keyed by instance, so a card that is already on the table keeps its
// node (and its animation) while the state around it changes.

import { CARDS } from './config.js';
import { SCREEN_LOSS, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './state.js';

let stage = null;
let nodes = null;
let shownDamage = null;
let confettiDone = false;

/** Build the stage once; render() only updates it from then on. */
export function buildStage(root) {
  stage = document.createElement('div');
  stage.id = 'stage';
  stage.innerHTML = `
    <div id="enemy-zone">
      <div class="fighter enemy" id="enemy-fighter">
        <div class="portrait">❄</div>
        <div class="fighter-info">
          <div class="fighter-name">FROST</div>
          <div class="lifebar"><div class="lifefill"></div><span class="lifetext"></span></div>
          <div class="block-badge"></div>
        </div>
      </div>
      <div id="intent"></div>
      <div id="enemy-hand" class="hand backs"></div>
    </div>
    <div id="table">
      <div id="enemy-played" class="played"></div>
      <div id="log-line"></div>
      <div id="player-played" class="played"></div>
    </div>
    <div id="player-zone">
      <div class="fighter player" id="player-fighter">
        <div class="portrait">🔥</div>
        <div class="fighter-info">
          <div class="fighter-name">EMBER — YOU</div>
          <div class="lifebar"><div class="lifefill"></div><span class="lifetext"></span></div>
          <div class="block-badge"></div>
          <div id="energy"></div>
        </div>
      </div>
      <div id="player-hand" class="hand"></div>
      <div id="controls">
        <button id="end-turn" type="button">End Turn</button>
        <div id="piles"></div>
        <div id="hint">Keys 1–7 play · Space ends turn · R restarts</div>
      </div>
    </div>
    <div id="title-screen" class="overlay">
      <div class="title-inner">
        <div class="title-flame">🔥</div>
        <h1>EMBER DUEL</h1>
        <p class="tagline">A turn-based card battler: you are Ember, the flame, against Frost.</p>
        <p class="howto">Each turn gain 3 energy and draw a card. Click a card (or press 1–7) to play it. Frost tells you what it will do — block it, then strike back. First to 0 life loses.</p>
        <button id="start-button" type="button">▶&nbsp; Start the duel</button>
        <p class="tiny">30 life each · 20-card deck · combos: play a red card, then Ember Chain hits harder</p>
      </div>
    </div>
    <div id="win-screen" class="overlay">
      <div class="end-inner win">
        <h1>🏆 VICTORY</h1>
        <p class="end-line">Frost melts. Ember burns brightest.</p>
        <p class="end-score" id="win-score"></p>
        <button id="win-restart" type="button">Play again (R)</button>
      </div>
    </div>
    <div id="loss-screen" class="overlay">
      <div class="end-inner loss">
        <h1>❄ DEFEAT</h1>
        <p class="end-line">The flame gutters out… Frost stands.</p>
        <p class="end-score" id="loss-score"></p>
        <button id="loss-restart" type="button">Try again (R)</button>
      </div>
    </div>
    <div id="popups"></div>
    <div id="confetti"></div>`;
  root.appendChild(stage);
  nodes = {
    enemyFighter: stage.querySelector('#enemy-fighter'),
    playerFighter: stage.querySelector('#player-fighter'),
    intent: stage.querySelector('#intent'),
    enemyHand: stage.querySelector('#enemy-hand'),
    enemyPlayed: stage.querySelector('#enemy-played'),
    playerPlayed: stage.querySelector('#player-played'),
    logLine: stage.querySelector('#log-line'),
    playerHand: stage.querySelector('#player-hand'),
    energy: stage.querySelector('#energy'),
    endTurn: stage.querySelector('#end-turn'),
    piles: stage.querySelector('#piles'),
    title: stage.querySelector('#title-screen'),
    win: stage.querySelector('#win-screen'),
    loss: stage.querySelector('#loss-screen'),
    winScore: stage.querySelector('#win-score'),
    lossScore: stage.querySelector('#loss-score'),
    popups: stage.querySelector('#popups'),
    confetti: stage.querySelector('#confetti'),
  };
  return nodes;
}

/** One card's DOM node. `faceDown` renders the Frost card back. */
function cardNode(card, faceDown, small) {
  const def = CARDS[card.id];
  const el = document.createElement('div');
  el.className = `card${small ? ' small' : ''}${faceDown ? ' back' : ''}`;
  el.dataset.instance = card.instance;
  if (faceDown) {
    el.innerHTML = `<div class="back-mark">❄</div>`;
    return el;
  }
  el.style.setProperty('--card-colour', def.colour);
  el.innerHTML = `
    <div class="cost">${def.cost}</div>
    <div class="art">${def.icon}</div>
    <div class="card-name">${def.name}</div>
    <div class="card-text">${def.text}</div>`;
  return el;
}

/** Keyed list render: keep nodes for cards still present, add new ones, drop the rest. */
function renderCardList(container, cards, opts) {
  const seen = new Set();
  const frag = document.createDocumentFragment();
  cards.forEach((card, index) => {
    seen.add(card.instance);
    let el = container.querySelector(`[data-instance="${card.instance}"]`);
    if (!el) {
      el = cardNode(card, opts.faceDown, opts.small);
      if (opts.animate && !opts.shotMode) el.classList.add('enter');
      frag.appendChild(el);
    }
    el.style.setProperty('--tilt', opts.fan ? `${(index - (cards.length - 1) / 2) * 3}deg` : '0deg');
    el.classList.toggle('playable', !!opts.playable && opts.playable(card));
    el.classList.toggle('cant', !!opts.playable && !opts.playable(card));
    if (!el.parentNode) frag.appendChild(el);
  });
  // Re-append in order so the DOM order matches the hand order.
  for (const el of [...frag.children]) container.appendChild(el);
  for (const el of [...container.children]) {
    if (!seen.has(el.dataset.instance)) el.remove();
  }
  // Reorder the container's children to match the cards order.
  const order = new Map(cards.map((c, i) => [c.instance, i]));
  [...container.children].sort((a, b) => (order.get(a.dataset.instance) ?? 99) - (order.get(b.dataset.instance) ?? 99))
    .forEach((el) => container.appendChild(el));
}

function setFighter(fighterEl, fighter, isEnemy) {
  const fill = fighterEl.querySelector('.lifefill');
  const text = fighterEl.querySelector('.lifetext');
  const badge = fighterEl.querySelector('.block-badge');
  const pct = Math.max(0, (fighter.life / fighter.maxLife) * 100);
  fill.style.width = `${pct}%`;
  fill.classList.toggle('low', pct <= 33);
  text.textContent = `${fighter.life} / ${fighter.maxLife}`;
  badge.textContent = fighter.block > 0 ? `🛡 ${fighter.block} block` : '';
  badge.classList.toggle('on', fighter.block > 0);
  fighterEl.classList.toggle('hurt', fighter.life <= 10);
}

/** A floating damage number over a fighter. */
function damagePopup(target, amount, absorbed, shotMode) {
  if (shotMode || amount <= 0) return;
  const el = document.createElement('div');
  el.className = `popup ${target}`;
  el.textContent = absorbed > 0 ? `-${amount} (${absorbed} blocked)` : `-${amount}`;
  nodes.popups.appendChild(el);
  setTimeout(() => el.remove(), 1100);
}

/** The win flourish: a burst of coloured pieces falling over the table. */
function confettiBurst(shotMode) {
  if (confettiDone) return;
  confettiDone = true;
  const colours = ['#f59e0b', '#e23b2e', '#f0562a', '#ffd166', '#7c3aed', '#16a34a'];
  /** A small avalanche hash, so each piece's x, y, fall and spin are unrelated. */
  const hash01 = (i, salt) => {
    let h = Math.imul((i + 1) * 2654435761 + salt * 40503, 1);
    h = Math.imul(h ^ (h >>> 15), 2246822519);
    h = Math.imul(h ^ (h >>> 13), 3266489917);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
  for (let i = 0; i < 48; i += 1) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = `${(hash01(i, 1) * 1200 + 40).toFixed(0)}px`;
    piece.style.background = colours[i % colours.length];
    piece.style.setProperty('--fall', `${(hash01(i, 2) * 420 + 260).toFixed(0)}px`);
    piece.style.setProperty('--spin', `${(hash01(i, 3) * 540 - 270).toFixed(0)}deg`);
    if (shotMode) {
      piece.style.top = `${(hash01(i, 4) * 420 + 80).toFixed(0)}px`;
      piece.style.transform = `rotate(${piece.style.getPropertyValue('--spin')})`;
    }
    nodes.confetti.appendChild(piece);
  }
}

/** Redraw the whole table from the game state. */
export function render(game, shotMode = false) {
  if (!nodes) return;
  if (game.screen !== SCREEN_WIN && confettiDone) {
    confettiDone = false;
    nodes.confetti.innerHTML = '';
  }
  setFighter(nodes.enemyFighter, game.enemy, true);
  setFighter(nodes.playerFighter, game.player, false);

  nodes.intent.textContent = game.phase === 'enemy' && game.intent ? game.intent : 'Frost is watching…';
  nodes.intent.classList.toggle('warn', game.phase === 'enemy' && !!game.intent);

  renderCardList(nodes.enemyHand, game.enemy.hand, { faceDown: true, small: true, animate: false, shotMode });
  renderCardList(nodes.enemyPlayed, game.enemy.played, { small: true, animate: true, shotMode });
  renderCardList(nodes.playerPlayed, game.player.played, { small: true, animate: true, shotMode });
  renderCardList(nodes.playerHand, game.player.hand, {
    fan: true,
    animate: true,
    shotMode,
    playable: (card) => game.screen === SCREEN_PLAY && game.phase === 'player' && CARDS[card.id].cost <= game.player.energy,
  });
  nodes.playerHand.classList.toggle('tight', game.player.hand.length >= 6);

  const orbs = [];
  for (let i = 0; i < 10; i += 1) orbs.push(`<span class="orb${i < game.player.energy ? ' on' : ''}"></span>`);
  nodes.energy.innerHTML = `<span class="energy-label">Energy</span>${orbs.join('')}`;
  nodes.piles.textContent = `Deck ${game.player.deck.length} · Discard ${game.player.discard.length} · Turn ${game.turn}`;
  nodes.endTurn.disabled = !(game.screen === SCREEN_PLAY && game.phase === 'player');
  nodes.logLine.textContent = game.log[game.log.length - 1] || '';

  if (game.lastDamage && game.lastDamage !== shownDamage) {
    shownDamage = game.lastDamage;
    damagePopup(game.lastDamage.target, game.lastDamage.amount, game.lastDamage.absorbed, shotMode);
  }

  nodes.title.classList.toggle('show', game.screen === SCREEN_TITLE);
  nodes.win.classList.toggle('show', game.screen === SCREEN_WIN);
  nodes.loss.classList.toggle('show', game.screen === SCREEN_LOSS);
  if (game.screen === SCREEN_WIN) {
    nodes.winScore.textContent = `Won on turn ${game.turn} with ${game.player.life} life left.`;
    confettiBurst(shotMode);
  }
  if (game.screen === SCREEN_LOSS) {
    nodes.lossScore.textContent = `Fell on turn ${game.turn}. Frost had ${game.enemy.life} life left.`;
  }
}
