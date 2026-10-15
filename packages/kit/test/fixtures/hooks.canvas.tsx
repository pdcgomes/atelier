import { Badge, Stack, Text, useCanvasState, useSessions, useTheme } from 'atelier';

export default function Hooks() {
  const sessions = useSessions();
  const theme = useTheme();
  const [count, setCount] = useCanvasState('count', 0);
  return (
    <Stack>
      <Text>
        <span id="theme">{theme.name}</span> · <span id="sessions">{sessions.length}</span> · <span id="working">{sessions.filter((s) => s.status === 'working').length}</span>
      </Text>
      <button id="bump" onClick={() => setCount((n) => n + 1)}>
        {count}
      </button>
      <Badge>{String(count)}</Badge>
    </Stack>
  );
}
