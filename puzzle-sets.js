// Named puzzle sets — used by puzzle.html's journey mode (phase 2).
//
// Each set has:
//   id       short URL-safe identifier (referenced via ?puzzle-set=<id>)
//   name     human-readable title shown on the journey page
//   puzzles  ordered list of puzzle entries. Each entry carries the full
//            sample shape ({ puzzle, solutions, difficulty, ruleset }) so
//            the journey page can render under the correct ruleset and
//            optionally show the hand-authored solutions.

import { samples } from './samples.js';

const byDifficulty = d => samples.filter(s => s.difficulty === d);

export const puzzleSets = [
    {
        id: "n1",
        name: "Narves 1st puzzle set!",
        puzzles: [
            ...byDifficulty("easy"),
            ...byDifficulty("medium"),
            ...byDifficulty("hard"),
        ],
    },
];
