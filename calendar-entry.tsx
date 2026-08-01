import React from 'react';
import ReactDOM from 'react-dom/client';
import CricketBoardCalendar from './CricketBoardCalendar';

const rootElement = document.getElementById('calendar-root');
if (!rootElement) {
  throw new Error("Could not find calendar-root element");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <CricketBoardCalendar />
  </React.StrictMode>
);
