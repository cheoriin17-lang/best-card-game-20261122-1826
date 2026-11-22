// Ember Court — boot: background, render loop, input wiring, screenshot scenes.
import { render } from './render.js';
import { stageShot, selfTest } from './shots.js';
import { startBackground } from './bg.js';
import { sfx } from './audio.js';
import { SCREEN_LOSE, SCREEN_PLAY, SCREEN_WIN, World } from './world.js';

const ui = {
  header: document.getElementById('header'),
  enemyArea: document.getElementById('enemy-area'),
  centerArea: document.getElementById('center-area'),
  playerArea: document.getElementById('player-area'),
  handArea: document.getElementById('hand-area'),
  overlay: document.getElementById('overlay'),
  status: document.getElementById('status'),
};

const errors = [];
window.addEventListener('error', (event) => { errors.push(String(event.message)); });

let world = new World((Date.now() % 100000) + 1);
let shotMode = false;

function draw() {
  render(world, ui, handlers);
  ui.status.textContent = world.log[world.log.length - 1] ?? '';
}

const handlers = {
  start() {
    sfx.play();
    world.startGame();
    draw();
  },
  playCard(uid) {
    const before = world.enemy ? world.enemy.hp : 0;
    if (world.playCard(uid)) {
      const def = world.player.discard[world.player.discard.length - 1];
      if (def) sfx.play();
      if (world.enemy && world.enemy.hp < before) sfx.hit();
      if (world.screen === SCREEN_WIN) sfx.win();
      if (world.screen === SCREEN_LOSE) sfx.lose();
    }
    draw();
  },
  endTurn() {
    world.endTurn();
    if (world.screen === SCREEN_WIN) sfx.win();
    if (world.screen === SCREEN_LOSE) sfx.lose();
    draw();
  },
};

function boot() {
  startBackground(document.getElementById('bg'));
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  const seed = Number(params.get('seed') ?? '1') || 1;

  if (params.get('selftest') === '1') {
    const result = selfTest(1, 30);
    const pre = document.createElement('pre');
    pre.id = 'selftest';
    pre.textContent = JSON.stringify({ ...result, consoleErrors: errors });
    document.body.appendChild(pre);
    document.title = `selftest wins=${result.wins} losses=${result.losses} errors=${result.errors.length}`;
    return;
  }

  if (shot) {
    shotMode = true;
    const staged = stageShot(shot, seed);
    if (!staged) {
      document.title = 'shot-failed';
      document.body.dataset.shotError = `no win staged for seed ${seed}`;
      return;
    }
    world = staged;
    draw();
    document.title = `shot:${shot} screen=${world.screen} duel=${world.duelIndex + 1} score=${world.score} php=${world.player.hp} ehp=${world.enemy ? world.enemy.hp : 0}`;
    window.__shotReady = true;
    return;
  }

  draw();
  window.__shotReady = true;
}

window.__ember = {
  get screen() { return world.screen; },
  get world() { return world; },
  get errors() { return errors; },
};

document.addEventListener('keydown', (event) => {
  if (shotMode) return;
  if (event.key === 'Enter' && world.screen === SCREEN_PLAY) handlers.endTurn();
  if (event.key === 'm' || event.key === 'M') sfx.toggleMute();
});

boot();
