# Working on Atelier

Atelier draws canvases in two viewers, the browser's (`packages/viewer`, `packages/kit`) and the terminal's (`tui/`, atelier-tui), from one kit. Both have to draw everything the kit has.

## When you change the kit

Adding a component, or a prop to one, means doing it in both viewers. CI fails until you do, and says what's missing.

1. The component in `packages/kit/src`, exported from `index.ts`. What it does, as opposed to how it looks, goes in `logic.ts`, which both kits use: the state keys it keeps, how it sorts or sends.
2. Its terminal side in `packages/kit/src/terminal/kit.tsx`, from the same logic, rendering `el('Name', props, slots, children)`.
3. A renderer in `tui/src/kit/`, in its file's `ALL`, listing the props it draws (`draws`) and those that don't apply in a terminal, with why (`not_here`).
4. A sample in `examples/components/components.canvas.tsx`, and a place in `examples/gallery/gallery.canvas.tsx`.
5. Then:

   ```sh
   node scripts/build.mjs && node scripts/fixtures.mjs   # kit.json, terminal.js and the fixtures
   npm test && npm run typecheck
   UPDATE_FRAMES=1 cargo test --manifest-path tui/Cargo.toml --test frames   # its frames; review the diff
   cargo test --manifest-path tui/Cargo.toml
   ```

`packages/kit/kit.json` and `tui/tests/frames/` are generated; commit them, and don't edit them by hand. docs/design.md has the rest, under "In a terminal".

## Seeing it

```sh
cargo run --manifest-path tui/Cargo.toml -- demo component-<Name>                  # the preview harness
cargo run --manifest-path tui/Cargo.toml -- demo <fixture> --snapshot --width 100  # one frame, as text
```
