import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Layers, Link2, MonitorSmartphone } from 'lucide-react';
import { bySlug } from '../projects.js';

export default function Project() {
  const { slug } = useParams();
  const p = bySlug[slug];

  if (!p) {
    return (
      <div className="project">
        <Link to="/" className="back">
          <ArrowLeft size={16} /> back
        </Link>
        <div className="empty">
          <p>nothing here. yet.</p>
        </div>
      </div>
    );
  }

  const pair = p.pairs && bySlug[p.pairs];

  return (
    <div className="project">
      <Link to="/" className="back">
        <ArrowLeft size={16} /> all things
      </Link>

      <header className="project-head">
        <img src={p.icon} alt={`${p.name} icon`} className="app-icon xl" />
        <div>
          <h1>{p.name}</h1>
          <p><span className="hl hl-pink">{p.tagline}</span></p>
        </div>
      </header>

      <div className="meta">
        <div className="meta-row">
          <MonitorSmartphone size={15} />
          {p.platforms.map(x => (
            <span key={x}>{x}</span>
          ))}
        </div>
        <div className="meta-row">
          <Layers size={15} />
          {p.stack.map(x => (
            <span key={x}>{x}</span>
          ))}
        </div>
      </div>

      <ul className="features">
        {p.features.map(({ icon: Icon, label }, i) => (
          <li key={label} style={{ '--i': i }}>
            <Icon size={20} strokeWidth={1.6} />
            <span>{label}</span>
          </li>
        ))}
      </ul>

      {pair && (
        <Link to={`/${pair.slug}`} className="pair">
          <Link2 size={16} />
          <span>pairs with</span>
          <img src={pair.icon} alt="" className="app-icon sm" />
          <strong>{pair.name}</strong>
        </Link>
      )}
    </div>
  );
}
