# Dream Story Studio — Project Status

Last reviewed: 2026-10-30
Repository: prps23-hub/dream-story-studio
Editor: https://prps23-hub.github.io/dream-story-studio/dream-story-ipad-publish/

## Product direction (agreed)
- Create mobile-portrait (9:16) Choices & Consequences games, edited primarily on iPad.
- Preserve the existing three-column iPad layout: assets on the left, scene preview in the center, story tools on the right; collapsible groups.
- Core goal: meaningful choices, branching and consequences, relationship values, inventory/evidence, multiple endings.
- No QTE or combat; use free tools and zero budget.
- Avoid rewriting working features or adding clutter.

## Reported working by the user
- Editor opens on iPad and phone.
- Export playable game to ZIP.
- Publish a game as a website using a GitHub token; playable by link.
- Screenshots show editor, collapsible panels, scene preview, dialogue controls, choices, ending controls, audio controls, and Story Tree.
These are user-reported/visually observed, NOT a complete regression test.

## Source-code presence checked on 2026-10-30
- `dream-story-ipad-publish/js/editor.js`: scene editing, backgrounds, characters, dialogue, choices, endings, Story Tree hooks.
- `dream-story-ipad-publish/js/audio57.js`: browser-local audio library, scene BGM/SFX, volume.
- `dream-story-ipad-publish/export/player/player.js`: exported game player, scene navigation, dialogue/choices/endings and audio logic.
- `dream-story-ipad-publish/export/exporter.js`: ZIP export implementation.
- `dream-story-ipad-publish/js/publish.js`: GitHub publish implementation.
- `dream-story-ipad-publish/editor.html`: three-part editor UI and controls.
- `dream-story-ipad-publish/js/workspace54.js`, `workspace55.js`: supplemental workspace controls.
Presence in code is not proof of end-to-end reliability.

## Not yet verified or planned
- Relationship score/flags system: planned, not confirmed implemented.
- Inventory and evidence with conditional use: planned, not confirmed implemented.
- General story variables and conditional dialogue/choices: planned, not confirmed implemented.
- Player save/load (including variables/items): not verified.
- Offline reliability, complex branches, audio export, and publish security: need tests.
- GitHub token: audit storage and ensure token never ships in exported/published game.

## Next work (in order)
1. Complete code inventory, inspect editor add-on scripts and player/export data model; document what exists vs missing.
2. Design a small shared variable/condition/action model for choices, relationships, and items.
3. Add the smallest compatible implementation without replacing existing UI or export.
4. Test on iPad and in exported game ZIP / published website; ask user for screenshots when needed.
5. Update this file after each verified change, including commit and test outcome.

## Development rules
- Read this file AND inspect latest repository code before each change.
- Never mark a feature working solely because a UI control or function exists.
- Work in small, reviewable changes; avoid touching unrelated working systems.
- Do not publish new gameplay changes until tested; preserve current live editor.
- Record known issues and actual test results here.
