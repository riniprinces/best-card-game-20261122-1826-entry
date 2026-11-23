// Ember Duel — the entrypoint: wires the state, the table and the input together.
// One file, one job: starting the game, and nothing else.

import { createGame } from './state.js';
import { buildStage, render } from './render.js';
import { bindInput } from './input.js';
import { shotName, shotSeed, stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const isShot = params.has('shot');

const game = isShot ? stageShot(shotName(), shotSeed()) : createGame(1);
const nodes = buildStage(document.getElementById('app'));
bindInput(game, nodes, () => render(game, isShot));
render(game, isShot);
if (isShot) document.body.classList.add('shot-mode');
