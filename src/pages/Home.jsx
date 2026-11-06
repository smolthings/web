import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Code2, Cpu } from 'lucide-react';
import { projects } from '../projects.js';
import Sayings from '../components/Sayings.jsx';

const TABS = [
  { key: 'software', label: 'software', icon: Code2 },
  { key: 'hardware', label: 'hardware', icon: Cpu }
];

export default function Home() {
  const [tab, setTab] = useState('software');
  const list = projects.filter(p => p.kind === tab);

  return (
    <div className="home">
      <section className="hero">
        <h1>
          smol<span>things</span>
          <i className="cursor" aria-hidden="true" />
        </h1>
        <Sayings />
      </section>

      <div className="tabs" role="tablist">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? 'on' : ''} onClick={() => setTab(key)}>
            <Icon size={14} />
            {label}
            <em>{projects.filter(p => p.kind === key).length}</em>
          </button>
        ))}
      </div>

      {list.length ? (
        <div className="grid">
          {list.map((p, i) => (
            <Link key={p.slug} to={`/${p.slug}`} className="card" style={{ '--i': i }}>
              <img src={p.icon} alt="" className="app-icon" />
              <div className="card-text">
                <h2>{p.name}</h2>
                <p><span className="hl">{p.tagline}</span></p>
                <div className="chips">
                  {p.platforms.map(x => (
                    <span key={x}>{x}</span>
                  ))}
                </div>
              </div>
              <ArrowUpRight className="card-arrow" size={18} />
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty">
          <Cpu size={28} strokeWidth={1.5} />
          <p>soon.</p>
        </div>
      )}
    </div>
  );
}
