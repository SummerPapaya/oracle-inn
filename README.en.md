<p align="center">
  <img src="docs/hero.webp" width="100%" alt="Oracle Inn: an arched gold window showing, in turn, the door, the Magic House, then each page of the pop-up book and the room inside it: the Starry Tent, the Eastern Shrine, the Scholar's Desk, the Victorian Tea Table, the Moonlit Window and the Nordic Hearth, and at last all six rooms together">
</p>

<p align="center">
  <a href="README.md">中文</a> · <b>English</b> · <a href="https://oracle-inn.summercommences.com">Play it</a>
</p>

# Oracle Inn · 借问众神明

A pop-up book of fortune-telling rooms, in the browser. Step through a door floating in the night sky into a little house full of travel souvenirs, open the book on the desk, and each page raises a tiny oracle room you can walk into and ask a question.

> **A gentle reminder**
>
> - The tarot, moon blocks, fortune slips, I Ching coins, character reading, Lenormand cards, tea leaves, pendulum, runes, New Year's tin and the rest are a light-hearted demonstration of Eastern and Western folk customs. Cards, blocks, slips and hexagrams, the shapes of the leaves in the cup, the pendulum's swing, the runes drawn and the tin poured are all chosen at random by the program, and the character readings are written in advance from the shape of each character; nothing here can predict anything.
> - It is for fun only, and is not medical, legal, financial or any other kind of life advice.
> - The shrine, the study, the tea room, the cottage by the window, the cabin by the hearth, the fortune-slip poems and the cards are original artwork and do not represent any religion, temple or deity. The hexagram names and images are excerpted from the Zhou Yi (I Ching), which is in the public domain.
> - The page collects and sends no personal information.
> - The 人生海海 (People Life, Ocean Wild) neon sign in the house is a fan's tribute to Mayday's album of that name. It is not affiliated with Mayday or their label, and all rights in it stay with their owners.
> - Your path is yours to choose; keep a clear head and decide for yourself. If you are going through a hard time, please reach out to someone you trust or to a professional.

## What's in v1.3

- **The door**: a 3D door that swings open onto a swirling star portal.
- **The Magic House**: things to poke at, including a gramophone playing a waltz, a little white cat with four moods, the fire, an hourglass, a sunburst mirror, a telescope, a treasure chest and a wishing tree. Each one's little star goes out once you've tried it.
- **The pop-up book**: six spreads; turn the pages and drag to look around.
  - **Page 1 · The Starry Tent** (tarot): swipe to shuffle, cut the deck by hand, then choose a single card, a three-card past–present–future spread or a six-card cross. Cards can come up reversed. The 22 Major Arcana are drawn as cats in a Mucha style, after the compositions of the 1909 public-domain deck.
  - **Page 2 · The Eastern Shrine** (moon blocks and fortune slips): a little temple in the Quanzhou style. Throw the moon blocks, or draw a lot: shake the cup until a stick falls, ask the blocks whether it is yours, then take its poem from the slip cabinet. The sixty poems were written for this book and are attributed to no deity.
  - **Page 3 · The Scholar's Desk** (I Ching coins and character reading): a scholar's study with a moon gate and a small garden, rice paper laid out on the desk.
    - 六爻 (I Ching coins): toss three coins six times; each line is drawn on the paper from the bottom up, old yin and old yang change, and you get the hexagram and the one it turns into. Each of the sixty-four hexagrams has a gentle reading written for this book, with no verdicts of good or bad luck.
    - 测字 (character reading): pick a character from the board or write your own. Over 140 characters people often carry on their minds have readings of their own; any other common character is read from its radical's imagery and its stroke count.
  - **Page 4 · The Victorian Tea Table** (Lenormand cards and tea leaves): a Victorian tea room on a night street corner, the table laid with lace and the tea already poured.
    - Lenormand: 36 cards drawn as silhouettes, read as a single card, a line of three or a square of nine. In a line of three the middle card is the heart of the matter; the square reads the heart and its road behind, road ahead, what is on your mind and what lies under your feet.
    - Tea leaves: drink the cup, swirl it three times, turn it over on its saucer, then turn it back and see what the leaves look like; near the rim, at the bottom and by the handle each mean something.
  - **Page 5 · The Moonlit Window** (pendulum and pendulum board): a white cottage and a stone tower on a moonlit island, with a crystal pendulum hanging over the low table under the round window.
    - Pendulum: first ask it to show its "yes" and its "no" (calibrating), then hold a yes-or-no question in mind.
    - Pendulum board: twelve cells laid out by the four seasons and four quarters of the Chinese tradition; wherever the pendulum settles, read the word for what this moment needs.
    - The moon in the round window is tonight's phase, worked out from the date and time; tap it to learn about that phase.
  - **Page 6 · The Nordic Hearth** (runes and New Year's tin): a log cabin on a snowed-in island under the northern lights, the fire lit, a white cloth on the low table by it and the pouch of rune stones.
    - Runes: all 24 of the Elder Futhark, never read reversed. Draw one; draw three, read by the three Norns as what has happened, what is happening and what is to come; or cast nine on the cloth and read the ones face up by where they land, in the middle, round it or at the edge.
    - New Year's tin: an old Finnish New Year's Eve custom. Melt a little horseshoe of tin over the fire, pour it into cold water, hold it up to the candle and see what its shadow on the white chimney breast looks like.
- Works on phones in portrait.

## Run it locally

The page fetches its 3D scenes, so serve it over HTTP rather than opening the file directly:

```bash
cd public
python3 -m http.server 8000
```

Then open <http://localhost:8000/>. Add `?dev` to the address for a frame counter and the `window.__book` debug hooks.

## Layout

| Path | What's there |
|---|---|
| `public/` | Everything that gets deployed: `index.html`, the deck gallery `cat-tarot-deck.html`, `404.html`, Cloudflare's `_headers`, the site icons (`favicon.*`, `apple-touch-icon.png`, `icon-*.png`, `site.webmanifest`) and the link-preview images (`og-image.jpg` 1200×630, `share-square.jpg` 600×600) |
| `public/tent/`, `public/shrine/`, `public/study/`, `public/tea/`, `public/window/`, `public/hearth/` | The six rooms baked in Blender for real-time 3D: glTF description, base64 geometry and two light atlases each |
| `public/deck/` | The 22 card faces and the card back |
| `public/vendor/` | three.js r169 and the web-font subsets, hosted with the site (with their licenses) |
| `src/` | Page source: shell and styles, procedurally painted textures and cards, scenes and interaction |
| `build.py` | Stitches `src/` into `public/index.html`, with the page's script in `public/js/app.<hash>.js` |
| `tools/` | Scripts that fetch three.js (`fetch_three.py`) and the web-font subsets (`fetch_fonts.py`) again; checks for font coverage (`check_fonts.mjs`) and for the reading texts (`check_content.mjs`); `cezi_table.py`, which builds the radical and stroke table for 测字 from Unihan |
| `blender/` | Modelling, texture-painting and baking scripts for the tent, the shrine, the study, the tea room, the window cottage and the hearth cabin, with their textures and open font subsets |
| `docs/` | The README hero and the social preview image |

## Build

```bash
python3 build.py              # writes public/index.html
python3 build.py --check      # also writes src/.check.mjs for: node --check src/.check.mjs
```

The web fonts hold only the characters the pages use. If `build.py` reports characters missing from the subsets after you change the text, run `python3 tools/fetch_fonts.py` to regenerate `public/vendor/fonts/`, then build again; `node tools/check_fonts.mjs` reads the glyphs actually in the font files and lists any character that would still fall back to a system font.

The tarot, fortune-slip, I Ching, 测字, Lenormand, tea-leaf, pendulum, moon-phase, rune and tin texts live in one place each, in `src/`. After changing them, `node tools/check_content.mjs` checks their form, repeats and wording; with `--json` it also prints every text, for making a proofreading table.

## 3D scenes (optional)

All six rooms are modelled from scratch by Blender 5.2 Python scripts and baked in Cycles into two light atlases:

```bash
blender/pipeline_tent_web.sh     # the Starry Tent
blender/pipeline_shrine.sh       # the Eastern Shrine (textures painted first by blender/shrine_tex.py with Pillow)
blender/pipeline_study.sh        # the Scholar's Desk (textures painted first by blender/study_tex.py with Pillow)
blender/pipeline_tea.sh          # the Victorian Tea Table (textures painted first by blender/tea_tex.py with Pillow)
blender/pipeline_window.sh       # the Moonlit Window (textures painted first by blender/window_tex.py with Pillow)
blender/pipeline_hearth.sh       # the Nordic Hearth (textures painted first by blender/hearth_tex.py with Pillow)
```

Each run gives its output a new time-stamped name, so browsers never show a stale cached scene. It then updates the names in `src/_rooms.js`, `src/_study.js`, `src/_tea.js`, `src/_window.js` or `src/_hearth.js` and rebuilds the page. Lettering on the textures uses the open fonts hosted with the site (`blender/webfont.py`). Exported JPEGs are stripped of metadata.

## Deploy

`public/` is a plain static site with no build step.

- **Cloudflare Pages**: connect this repository, leave the build command empty, set the output directory to `public`, and add the subdomain under Custom domains.
- **Cloudflare Workers**: `wrangler.jsonc` is included, so `npx wrangler deploy` publishes `public/`.

`public/_headers` sets a Content Security Policy that allows only the site's own files, and lets the versioned scene files, three.js and the fonts be cached for a long time.

## Credits

- [three.js](https://threejs.org/) r169 (MIT), hosted with the site in `public/vendor/three/`.
- Web fonts, all under the SIL Open Font License: Noto Serif SC, Long Cang, LXGW WenKai TC (for the characters Long Cang lacks, such as 筊 and the parts 测字 shows) and Cormorant Garamond. The subsets come from Google Fonts and are hosted with the site in `public/vendor/fonts/`.
- The shrine's plaque, couplets, slip numbers and scroll titles are set in the open fonts Noto Serif TC and LXGW WenKai TC. The subsets and their licenses are in `blender/fonts/`.
- The tarot compositions and symbols follow the 1909 deck drawn by Pamela Colman Smith (public domain). The images are newly drawn.
- The hexagram names and images are excerpted from the Zhou Yi (I Ching), which is in the public domain; the reading for each hexagram is newly written.
- The Lenormand cards keep the order and the playing-card insets of the old decks, from the Game of Hope of about 1799 onwards (public domain); the faces are newly drawn silhouettes and the meanings newly written.
- The radical and stroke table for 测字 is generated from Unicode's [Unihan database](https://www.unicode.org/reports/tr38/) (© Unicode, Inc., Unicode License v3; see [LICENSE-UNICODE.txt](LICENSE-UNICODE.txt)).
- Every texture, card and scene in the page is painted by code or built by Blender scripts. No outside image assets are used.

## Privacy

- No cookies, no analytics. Your questions and readings are never sent anywhere.
- The page makes no third-party requests: three.js and the fonts load from the site itself.
- The "ask the reader" AI reading only works inside a Claude Artifact, where the viewer's own Claude account writes it and nothing is kept. On the open web the button and the question box don't appear.

## License

- Code: [MIT](LICENSE).
- Artwork and writing (cards, scenes, textures, hero images, fortune-slip poems and in-page text): © 2026 SummerPapaya, all rights reserved. See [LICENSE-ASSETS.md](LICENSE-ASSETS.md).

## Versions

- **v1.3.1** (2026-10-31): the link previews, the GitHub social preview and the README hero now show all six rooms, and the page description and the reminder name every room's readings; in the Nordic Hearth the dog has both ears again, the ladle's handle meets its bowl, and the snowman outside wears a red knitted hat; the little white cat in the Magic House is a fifth bigger, her head a little rounder.
- **v1.3.0** (2026-10-31): page 6, the Nordic Hearth (runes and New Year's tin), is fully playable, with the northern lights moving and snow falling outside; all six rooms of the book are open, and page 6's preview is gone; the tower on page 5 has its whole cone back and its windows and stones are no longer stretched; the Magic House's cat is now a fluffy little white cat asleep in a bed between the fireplace and the bookcase, who lifts her head and opens her odd eyes, one blue and one amber, when you tap her, and can be seen on phones by turning the view.
- **v1.2.0** (2026-10-30): page 5, the Moonlit Window (pendulum and pendulum board), is fully playable, with tonight's moon phase in its window.
- **v1.1.0** (2026-10-29): page 3, the Scholar's Desk (I Ching coins and character reading), and page 4, the Victorian Tea Table (Lenormand cards and tea leaves), are fully playable; every tarot card gains a keyword and every fortune slip a one-line gist, with revised card meanings, poems and readings; the web fonts now hold every character the pages use and any 测字 might write; the rooms open on matching views.
- **v1.0.0** (2026-10): first release. The Magic House, all six spreads of the book, the Starry Tent (tarot) and the Eastern Shrine (moon blocks and fortune slips) are fully playable; the other four pages have previews.
