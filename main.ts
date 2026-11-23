// Ember Duel — the program that hands the game in (Node 22, stdlib only).
//
// What it hands in: game/, the playable card battler as plain static files
// (game/index.html plus its ES modules and stylesheet, no library, nothing
// loaded over the network), and screenshots/, four real renders of that game
// in a browser — title, mid-game table, victory and defeat. The program copies
// both folders from beside itself into the output directory and writes the
// dossier there: /output/dossier.json, the summary the judge reads, built by
// the kit's vendored library (vendor/makefun-game.ts, unchanged).
//
// Run it outside the grader with MAKEFUN_OUTPUT_DIR standing in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

/** The bounty's own caps, from its gate: the text cap shapes the dossier's
 *  bytes, the rest refuse an entry the scorer would refuse (more than 4
 *  screenshots or one over 256 KiB; more than 993 entries in game/ or 48 MiB
 *  of game files in all; a path under game/ over 1000 bytes). */
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

/** Copy the game and its screenshots into `out`, then write the dossier there. */
function handIn(repoDir, out) {
  mkdirSync(out, { recursive: true });
  cpSync(join(repoDir, 'game'), join(out, 'game'), { recursive: true });
  mkdirSync(join(out, 'screenshots'), { recursive: true });
  const shots = join(repoDir, 'screenshots');
  if (existsSync(shots)) cpSync(shots, join(out, 'screenshots'), { recursive: true });
  writeFileSync(join(out, 'dossier.json'), buildDossier(out, CAPS));
}

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
handIn(repoDir, outDir);
