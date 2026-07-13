import { Route, Routes } from 'react-router';

import { TopographicBackground } from './components/TopographicBackground';
import { Home } from './pages/Home';
import { Privacy } from './pages/Privacy';

function App() {
  return (
    <div className="min-h-dvh text-foreground">
      {/* Note: no bg-background here — the base colour lives on <body> in
          index.css so the fixed -z-10 topographic layer shows through instead
          of being painted over by this wrapper's own background. */}
      {/* Behind every route. */}
      <TopographicBackground />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/privacy" element={<Privacy />} />
      </Routes>
    </div>
  );
}

export default App;
