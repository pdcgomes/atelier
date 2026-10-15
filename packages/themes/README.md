# Themes

76 themes, each the colours canvases use (docs/design.md, "Themes and the look"). They're generated into `themes.json` by `scripts/import.mjs`, and `scripts/check.mjs` checks each colour reaches its contrast on what it's shown on.

## From Omarchy

Omarchy's palettes, from `themes/<name>/colors.toml` in [omacom/omarchy](https://github.com/omacom/omarchy) at the commit `scripts/import.mjs` pins (MIT; the licence is in the repository's NOTICE). Tokyo Night is the default.

Tokyo Night (dark), Catppuccin (dark), Catppuccin Latte (light), Ethereal (dark), Everforest (dark), Flexoki Light (light), Gruvbox (dark), Hackerman (dark), Kanagawa (dark), Last Horizon (dark), Lumon (dark), Lupine (light), Matte Black (dark), Miasma (dark), Nord (dark), Osaka Jade (dark), Retro 82 (dark), Ristretto (dark), Rosé Pine (light), Solitude (dark), Starship (dark), Vantablack (dark), White (light).

## From haunt

The themes of haunt, a phone app for coding agents' chats. Each follows the well-known colour scheme it's named after; where Omarchy has the same scheme, Omarchy's is used.

Moonlight (dark), Dracula (dark), Solarized (dark), One Dark (dark), Monokai (dark), Ocean (dark), Sakura (dark), Copper (dark), Vinyl Noir (dark), Neon Dusk (dark), Burnt Tape (dark), Phantom Frequency (dark), Velvet Static (dark), Oxblood (dark), Mimosa (dark), Absinthe (dark), Kyoto Moss (dark), Reading Room (dark), Peacock (dark), Antique Map (dark), Newsprint (dark), Nacre (dark), Aubergine (dark), Tokyo Night (light), Kanagawa (light), Moonlight (light), Catppuccin (light), Rosé Pine (light), Nord (light), Everforest (light), Gruvbox (light), Dracula (light), Solarized (light), One Dark (light), Monokai (light), Ocean (light), Sakura (light), Copper (light), Vinyl Noir (light), Neon Dusk (light), Burnt Tape (light), Phantom Frequency (light), Velvet Static (light), Oxblood (light), Mimosa (light), Absinthe (light), Kyoto Moss (light), Reading Room (light), Peacock (light), Antique Map (light), Newsprint (light), Nacre (light), Aubergine (light).

## Changing them

- `node scripts/import.mjs` writes `themes.json` from `sources/`; `--fetch` downloads Omarchy's palettes again first.
- A colour that doesn't reach its contrast is moved away from its background just far enough to reach it, so a palette keeps its character.
