import { Route, Routes } from 'react-router';

import { TopographicBackground } from './components/TopographicBackground';
import { PanelShell, PlainShell } from './components/ShellFrame';
import { Home } from './pages/Home';
import { Privacy } from './pages/Privacy';
import { Proto } from './pages/Proto';

function App() {
  return (
    <div className="min-h-dvh text-foreground">
      {/* Note: no bg-background here — the base colour lives on <body> in
          index.css so the fixed -z-10 topographic layer shows through instead
          of being painted over by this wrapper's own background. */}
      {/* Behind every route. */}
      <TopographicBackground />

      <Routes>
        {/* Home carries the profile panel; every other route gets the same pane
            and rail without it. See ShellFrame for the shared frame. */}
        <Route element={<PanelShell />}>
          <Route path="/" element={<Home />} />
        </Route>
        <Route element={<PlainShell />}>
          <Route path="/privacy" element={<Privacy />} />
          {/* Throwaway: three career treatments to choose between. Not linked
              from anywhere, and deleted once a direction is picked. */}
          <Route path="/proto" element={<Proto />} />
        </Route>
      </Routes>
    </div>
  );
}

export default App;
