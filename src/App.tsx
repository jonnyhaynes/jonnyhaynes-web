import { Route, Routes } from 'react-router';

import { Home } from './pages/Home';
import { Privacy } from './pages/Privacy';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/privacy" element={<Privacy />} />
    </Routes>
  );
}

export default App;
