// Build URLs to puzzle.html. Shared by the index sample links and the
// puzzle-page journey nav so the URL format stays in one place.
//
// Pass `setId` for set-mode (the entry's own ruleset wins on the page, so
// `ruleset` is unnecessary). Pass `ruleset` for stand-alone links; omitted
// or 'default' is dropped from the URL.
export function puzzleHref({ puzzle, ruleset, setId }) {
    const p = new URLSearchParams({ puzzle });
    if (setId) p.set('puzzle-set', setId);
    else if (ruleset && ruleset !== 'default') p.set('ruleset', ruleset);
    return `puzzle.html?${p}`;
}
