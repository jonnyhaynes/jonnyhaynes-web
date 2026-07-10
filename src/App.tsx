import { Route, Routes } from 'react-router';

import { TopographicBackground } from './components/TopographicBackground';
import { Home } from './pages/Home';
import { Privacy } from './pages/Privacy';

function App() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
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
