import { useEffect, useState } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { CloudRain, Droplets, Flame, Github, Waves } from 'lucide-react';
import AsciiBackground, { MODES } from './components/AsciiBackground.jsx';
import Home from './pages/Home.jsx';
import Project from './pages/Project.jsx';

const MODE_ICONS = { liquid: Droplets, current: Waves, rain: CloudRain, ember: Flame };

function load() {
  const q = new URLSearchParams(window.location.search).get('bg');
  if (q && MODES[q]) return q;
  try {
    const m = localStorage.getItem('smol-bg');
    return m && MODES[m] ? m : 'liquid';
  } catch {
    return 'liquid';
  }
}

export default function App() {
  const [mode, setMode] = useState(load);
  const { pathname } = useLocation();

  useEffect(() => {
    try {
      localStorage.setItem('smol-bg', mode);
    } catch {}
  }, [mode]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <AsciiBackground mode={mode} />

      <header className="nav">
        <Link to="/" className="wordmark">
          smol<span>things</span>
          <b className="dot">.</b>work
        </Link>
        <nav>
          <a href="https://github.com/TheCodedKid" target="_blank" rel="noreferrer" aria-label="GitHub" className="icon-btn">
            <Github size={18} />
          </a>
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/:slug" element={<Project />} />
        </Routes>
      </main>

      <div className="bg-switch" role="radiogroup" aria-label="Background">
        {Object.entries(MODES).map(([key, m]) => {
          const Icon = MODE_ICONS[key];
          return (
            <button
              key={key}
              role="radio"
              aria-checked={mode === key}
              aria-label={m.label}
              data-tip={m.label}
              className={mode === key ? 'on' : ''}
              onClick={() => setMode(key)}
            >
              <Icon size={15} />
            </button>
          );
        })}
      </div>
    </>
  );
}
