import { Route, Routes } from 'react-router';

import { TopographicBackground } from './components/TopographicBackground';
import { PanelShell, PlainShell } from './components/ShellFrame';
import { Home } from './pages/Home';
import { Privacy } from './pages/Privacy';
import { Proto } from './pages/Proto';
import { ProtoShell } from './proto/ProtoShell';

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
        </Route>

        {/* PROTOTYPE ONLY. Its own shell so the shipped one stays untouched, and
            it hands the background back to the drift on unmount. Delete this
            route, the proto/ directory and proto.css once a direction is agreed. */}
        <Route element={<ProtoShell />}>
          <Route path="/proto" element={<Proto />} />
        </Route>
      </Routes>
    </div>
  );
}

export default App;
