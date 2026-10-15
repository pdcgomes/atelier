# Security

## Reporting a vulnerability

Please report security problems privately, through GitHub: open the repository's **Security** tab and choose **Report a vulnerability**. Don't open a public issue for them.

Say what you found, how to reproduce it, and what it lets someone do. You'll get a reply within a week, and a fix or a plan for one as soon as the problem is understood.

## Supported versions

Atelier is at 0.1. Fixes go into the latest release only.

## What's in scope

Atelier runs a daemon on `127.0.0.1`, shows canvases that agents write in a sandboxed frame, and can start Claude Code sessions when you confirm. Anything that lets a canvas, a web page or another local user get past those boundaries is in scope: reading files outside your projects, reaching the daemon without its token, running an action you didn't confirm, or a canvas reaching the network or the page around it.

[docs/security.md](docs/security.md) describes the design and what each boundary protects.
