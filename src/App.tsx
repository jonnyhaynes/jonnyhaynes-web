import { Routes, Route } from 'react-router';

import Home from './pages/Home';
import About from './pages/About';
import Privacy from './pages/Privacy';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
      <Route path="/privacy" element={<Privacy />} />
    </Routes>
  );
}

export default App;
