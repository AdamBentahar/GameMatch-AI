// Ensure window.fetch has both getter and setter across prototype chain
if (typeof window !== 'undefined') {
  try {
    const orig = window.fetch;
    let stored = typeof orig === 'function' ? (input: RequestInfo | URL, init?: RequestInit) => orig.call(window, input, init) : orig;

    let curr: any = window;
    while (curr) {
      try {
        const desc = Object.getOwnPropertyDescriptor(curr, 'fetch');
        if (desc && (desc.get || !desc.writable)) {
          Object.defineProperty(curr, 'fetch', {
            configurable: true,
            enumerable: true,
            get: () => stored,
            set: (v) => { stored = v; },
          });
        }
      } catch {}
      try {
        curr = Object.getPrototypeOf(curr);
      } catch {
        break;
      }
    }

    if (typeof Window !== 'undefined' && Window.prototype) {
      try {
        Object.defineProperty(Window.prototype, 'fetch', {
          configurable: true,
          enumerable: true,
          get: () => stored,
          set: (v) => { stored = v; },
        });
      } catch {}
    }

    try {
      Object.defineProperty(window, 'fetch', {
        configurable: true,
        enumerable: true,
        get: () => stored,
        set: (v) => { stored = v; },
      });
    } catch {}
  } catch {}
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
