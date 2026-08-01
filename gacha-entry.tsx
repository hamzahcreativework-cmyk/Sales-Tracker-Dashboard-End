import React from 'react';
import ReactDOM from 'react-dom/client';
import GachaponGame from './GachaponGame';

const rootElement = document.getElementById('gacha-root');
if (!rootElement) {
  throw new Error("Could not find gacha-root element");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <GachaponGame />
  </React.StrictMode>
);
