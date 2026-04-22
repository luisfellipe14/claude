// Ícones inline SVG — feather-style
const Icon = ({ name, size = 16, ...rest }) => {
  const paths = {
    zap:       <path d="M13 2 L3 14 h7 l-1 8 10-12 h-7 z"/>,
    search:    <><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>,
    plus:      <><path d="M12 5v14M5 12h14"/></>,
    x:         <><path d="M18 6 6 18M6 6l12 12"/></>,
    kanban:    <><rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="10" rx="1"/><rect x="17" y="4" width="4" height="7" rx="1"/></>,
    gantt:     <><path d="M4 6h8M4 12h12M4 18h6" strokeLinecap="round"/></>,
    calendar:  <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></>,
    sun:       <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></>,
    moon:      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/>,
    clock:     <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    repeat:    <><path d="M17 2l4 4-4 4M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v1a4 4 0 0 1-4 4H3"/></>,
    filter:    <path d="M3 5h18l-7 9v6l-4-2v-4z"/>,
    check:     <path d="m5 12 5 5L20 7"/>,
    alert:     <><path d="M12 2 2 20h20z"/><path d="M12 9v5M12 17.5v.5"/></>,
    flag:      <><path d="M4 22V4M4 4h14l-2 5 2 5H4"/></>,
    inbox:     <><path d="M3 13h6l2 3h4l2-3h4M3 13v7h18v-7M3 13l2-7h14l2 7"/></>,
    export:    <><path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v3h16v-3"/></>,
    chevronL:  <path d="m15 6-6 6 6 6"/>,
    chevronR:  <path d="m9 6 6 6-6 6"/>,
    chevronD:  <path d="m6 9 6 6 6-6"/>,
    moreH:     <><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></>,
    tag:       <><path d="M20 12 12 20l-9-9V3h8z"/><circle cx="7" cy="7" r="1.5"/></>,
    user:      <><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></>,
    trash:     <><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/></>,
    link:      <><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></>,
    flash:     <path d="M13 2 L3 14 h7 l-1 8 10-12 h-7 z"/>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
         {...rest}>
      {paths[name]}
    </svg>
  );
};

// Brand mark — raio estilizado em bolt geométrico
const BrandMark = () => (
  <div className="brand-mark">
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M14 2 L5 13 h5 l-2 9 11-14 h-6 z"/>
    </svg>
  </div>
);

const Avatar = ({ id, size }) => {
  const p = TEAM.find(t => t.id === id);
  if (!p) return null;
  // Cor derivada do id
  const hues = { me: 75, rs: 320, mc: 210, ab: 150, lf: 30 };
  const hue = hues[id] ?? 75;
  const style = {
    background: `oklch(92% 0.04 ${hue})`,
    color: `oklch(32% 0.08 ${hue})`,
    borderColor: `oklch(82% 0.06 ${hue})`,
    width: size, height: size,
    fontSize: size ? size * 0.4 : undefined,
  };
  return <div className="avatar" style={style} title={p.name}>{p.initials}</div>;
};

Object.assign(window, { Icon, BrandMark, Avatar });
