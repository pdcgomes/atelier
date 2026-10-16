#!/usr/bin/env node
// The `atelier` command.

import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { check, describe } from './check.ts';
import { connect, daemonCommand } from './client.ts';
import { paths, readJson } from './home.ts';
import { FOLDER } from './library.ts';
import { eventsSince, readState } from './state.ts';
import { VERSION } from './server.ts';

const HELP = `atelier ${VERSION}: themeable canvases for Claude Code.

  atelier open [canvas]        Shows a canvas in the viewer, or the viewer itself
  atelier tui [canvas]         The viewer in this terminal: atelier-tui, which is built with Rust
  atelier new <template> <name> Starts a canvas from a template, in this project's .atelier folder
  atelier check <canvas>...    Builds, type checks and checks a canvas's rules
  atelier state <canvas>       What you've done on a canvas: its state and the changes [--since <ISO time>]
  atelier list                 The canvases the daemon knows
  atelier templates            The templates there are
  atelier themes               The themes there are
  atelier status               Whether the daemon is running, and what it knows
  atelier stop                 Stops the daemon
  atelier install              Keeps the daemon running as a LaunchAgent, outside any agent's sandbox
  atelier uninstall            Stops the LaunchAgent and removes it
  atelier daemon [--port N]    Runs the daemon in the foreground
  atelier hook <event>         For Claude Code's hooks: reads the hook's JSON on standard input
  atelier mcp                  An MCP server over standard input and output, for agents

Canvases live in a project's ${FOLDER}/ folder: <name>.canvas.tsx for anything
custom, or <name>.canvas.json for a template. docs/design.md has the rest.`;

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
}

async function main(argv: string[]) {
  const [command, ...args] = argv;
  switch (command) {
    case undefined:
    case 'help':
    case '--help':
    case '-h':
      return console.log(HELP);
    case '--version':
    case '-v':
    case 'version':
      return console.log(VERSION);
    case 'daemon': {
      const { serve } = await import('./server.ts');
      const port = flag(args, 'port');
      const { info } = await serve({ port: port ? Number(port) : undefined });
      return console.log(`Atelier is at http://127.0.0.1:${info.port}/ (process ${info.pid}).`);
    }
    case 'open': {
      const client = await connect();
      const path = args.find((a) => !a.startsWith('--'));
      const result = await client!.call<{ shown: boolean; opened: boolean; in?: string; url: string }>('POST', '/api/open', path ? { path: resolve(path) } : {});
      if (!result.shown) console.log(`Open ${result.url}`);
      else if (result.opened) console.log(result.in === 'terminal' ? 'Opened in a terminal.' : 'Opened in your browser.');
      else console.log('Shown in the viewer.');
      return;
    }
    case 'check': {
      const files = args.filter((a) => !a.startsWith('--'));
      if (!files.length) throw new Error('Say which canvas to check: atelier check .atelier/<name>.canvas.tsx');
      let failed = false;
      for (const file of files) {
        const result = await check(resolve(file));
        if (result.ok) console.log(`${file}: no problems`);
        else {
          failed = true;
          console.log(describe(result.problems));
        }
      }
      process.exitCode = failed ? 1 : 0;
      return;
    }
    case 'state': {
      const file = args.find((a) => !a.startsWith('--'));
      if (!file) throw new Error('Say which canvas: atelier state .atelier/<name>.canvas.tsx');
      return console.log(JSON.stringify({ state: readState(resolve(file)), events: eventsSince(resolve(file), flag(args, 'since')) }, null, 2));
    }
    case 'list': {
      const client = await connect({ start: false });
      if (client) {
        const { canvases } = await client.call<{ canvases: { path: string; title: string; kind: string }[] }>('GET', '/api/canvases');
        for (const c of canvases) console.log(`${c.title}  ${c.kind}  ${c.path}`);
        return;
      }
      const roots = [...new Set([process.cwd(), ...readJson<string[]>(paths.projects, [])])];
      for (const root of roots) {
        const folder = join(root, FOLDER);
        if (!existsSync(folder)) continue;
        for (const name of readdirSync(folder)) if (/\.canvas\.(tsx|json)$/.test(name)) console.log(join(folder, name));
      }
      return;
    }
    case 'themes': {
      const { themes } = await import('@atelier/themes');
      for (const t of themes) console.log(`${t.id.padEnd(22)} ${t.name} (${t.dark ? 'dark' : 'light'}, from ${t.source === 'omarchy' ? 'Omarchy' : 'haunt'})`);
      return;
    }
    case 'status': {
      const client = await connect({ start: false });
      if (!client) return console.log("Atelier's daemon isn't running. `atelier open` starts it.");
      const status = await client.call<Record<string, unknown>>('GET', '/api/status');
      return console.log(JSON.stringify(status, null, 2));
    }
    case 'stop': {
      const { installed } = await import('./install.ts');
      const client = await connect({ start: false });
      if (!client) return console.log("Atelier's daemon isn't running.");
      await client.call('POST', '/api/stop');
      return console.log(installed() ? 'Stopped. It runs as a LaunchAgent, so launchd starts it again; `atelier uninstall` stops it for good.' : 'Stopped.');
    }
    case 'install': {
      const { install } = await import('./install.ts');
      const stopRunning = async () => {
        const running = await connect({ start: false });
        if (running) await running.call('POST', '/api/stop').catch(() => {});
      };
      const plist = await install(await daemonCommand(), stopRunning);
      const client = await connect({ start: true });
      console.log(`Installed ${plist}. launchd keeps the daemon running in your login session, at http://127.0.0.1:${client!.info.port}/.`);
      return console.log('Run atelier install again after updating atelier, and `atelier uninstall` to take it away.');
    }
    case 'uninstall': {
      const { uninstall, plistPath } = await import('./install.ts');
      return console.log(uninstall() ? `Stopped the daemon and removed ${plistPath()}.` : "atelier's LaunchAgent isn't installed.");
    }
    default: {
      const more = await import('./commands.ts').catch(() => null);
      if (more?.commands[command]) return more.commands[command](args);
      throw new Error(`There's no command "${command}". \`atelier help\` lists them.`);
    }
  }
}

main(process.argv.slice(2)).catch((e) => {
  console.error((e as Error).message ?? e);
  process.exitCode = 1;
});
