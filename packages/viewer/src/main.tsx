import { createRoot } from 'react-dom/client';
import { css as kit } from '../../kit/src/styles.ts';
import { App } from './app.tsx';
import { css } from './styles.ts';

const style = document.createElement('style');
style.textContent = kit + css;
document.head.append(style);

createRoot(document.getElementById('app')!).render(<App />);
