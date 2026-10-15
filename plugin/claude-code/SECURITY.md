# Security

Please report security problems in the Atelier plugin privately, through GitHub: open the [repository's](https://github.com/pdcgomes/atelier) **Security** tab and choose **Report a vulnerability**. Don't open a public issue for them.

The plugin runs `atelier hook` from Claude Code's hooks and `atelier mcp` as an MCP server. Neither takes any action outside the project without your confirmation in the viewer. The repository's [SECURITY.md](https://github.com/pdcgomes/atelier/blob/master/SECURITY.md) covers what's in scope and which versions are supported, and [docs/security.md](https://github.com/pdcgomes/atelier/blob/master/docs/security.md) describes the design.
