// Portfolio components — icon set, sidebar, messages, artifact panel
// Loaded as Babel/JSX. Components are exported to window at the end.

// ----- Icon set (line, 18px) -----
const Icon = ({ name, size = 18 }) => {
  const s = { width: size, height: size, fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" };
  const paths = {
    spark:    <><path d="M12 3v4"/><path d="M12 17v4"/><path d="M3 12h4"/><path d="M17 12h4"/><path d="M5.6 5.6l2.8 2.8"/><path d="M15.6 15.6l2.8 2.8"/><path d="M5.6 18.4l2.8-2.8"/><path d="M15.6 8.4l2.8-2.8"/></>,
    folder:   <><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></>,
    user:     <><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></>,
    wrench:   <><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4l-6 6 2 2 6-6a4 4 0 0 0 5.4-5.4l-2 2-2-2 2-2z"/></>,
    briefcase:<><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/></>,
    compass:  <><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></>,
    mail:     <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 7 9-7"/></>,
    plus:     <><path d="M12 5v14"/><path d="M5 12h14"/></>,
    send:     <><path d="M4 12l16-8-6 16-3-7z"/></>,
    sun:      <><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.9 4.9l1.4 1.4"/><path d="M17.7 17.7l1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M4.9 19.1l1.4-1.4"/><path d="M17.7 6.3l1.4-1.4"/></>,
    moon:     <><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></>,
    close:    <><path d="M6 6l12 12"/><path d="M18 6l-12 12"/></>,
    chevronL: <><path d="M15 6l-6 6 6 6"/></>,
    chevronR: <><path d="M9 6l6 6-6 6"/></>,
    sparkles: <><path d="M12 4l1.5 4.5L18 10l-4.5 1.5L12 16l-1.5-4.5L6 10l4.5-1.5z"/><path d="M19 4l.7 2 2 .7-2 .7L19 9.4l-.7-2-2-.7 2-.7z"/></>,
    download: <><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/></>,
    external: <><path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></>,
    search:   <><circle cx="11" cy="11" r="6"/><path d="M20 20l-4.3-4.3"/></>,
    file:     <><path d="M6 3h8l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v4h4"/></>,
    check:    <><path d="M5 12l4 4 10-10"/></>,
    slash:    <><path d="M16 4l-8 16"/></>,
    bot:      <><rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 4v4"/><circle cx="9" cy="14" r="1"/><circle cx="15" cy="14" r="1"/></>,
    arrow:    <><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></>,
    menu:     <><path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/></>,
  };
  return <svg viewBox="0 0 24 24" {...s}>{paths[name] || null}</svg>;
};

// ----- Markdown-lite (just bold + line breaks) -----
const renderInline = (text) => {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
    return <React.Fragment key={i}>{p}</React.Fragment>;
  });
};

// ----- Streaming text hook (typewriter) -----
const useStream = (text, speed = 12, enabled = true) => {
  const [out, setOut] = React.useState(enabled ? "" : text);
  const [done, setDone] = React.useState(!enabled);
  React.useEffect(() => {
    if (!enabled) { setOut(text); setDone(true); return; }
    setOut(""); setDone(false);
    let i = 0;
    const id = setInterval(() => {
      i += Math.max(1, Math.round(text.length / 180));
      if (i >= text.length) { setOut(text); setDone(true); clearInterval(id); }
      else setOut(text.slice(0, i));
    }, speed);
    return () => clearInterval(id);
  }, [text, enabled]);
  return [out, done];
};

// ----- Sidebar -----
const Sidebar = ({ data, collapsed, onCollapse, activeId, onPick, onNew, theme, onTheme, mobileOpen, onMobileClose, palette, onPalette }) => {
  const palettes = [
    { id: "terracotta", name: "Terracotta", swatch: "oklch(0.62 0.14 38)" },
    { id: "moss",       name: "Moss",       swatch: "oklch(0.50 0.10 150)" },
    { id: "cobalt",     name: "Cobalt",     swatch: "oklch(0.52 0.16 255)" }
  ];
  return (
    <aside className={"sidebar " + (collapsed ? "collapsed " : "") + (mobileOpen ? "mobile-open" : "")}>
      <div className="sb-top">
        <div className="brand">
          <div className="brand-mark"><Icon name="sparkles" size={16}/></div>
          {!collapsed && <div className="brand-text">
            <div className="brand-name">amit.workspace</div>
            <div className="brand-sub">portfolio · v1.0</div>
          </div>}
        </div>
        <button className="icon-btn desktop-only" onClick={onCollapse} title={collapsed ? "Expand" : "Collapse"}>
          <Icon name={collapsed ? "chevronR" : "chevronL"} size={16}/>
        </button>
        <button className="icon-btn mobile-only" onClick={onMobileClose} title="Close">
          <Icon name="close" size={16}/>
        </button>
      </div>

      <button className="new-chat" onClick={onNew}>
        <Icon name="plus" size={15}/>
        {!collapsed && <span>New chat</span>}
      </button>

      {!collapsed && <div className="sb-section-label">Pinned conversations</div>}

      <nav className="conv-list">
        {data.conversations.map(c => (
          <button
            key={c.id}
            className={"conv " + (activeId === c.id ? "active" : "")}
            onClick={() => onPick(c.id)}
            title={c.title}
          >
            <span className="conv-icon"><Icon name={c.icon} size={15}/></span>
            {!collapsed && (
              <span className="conv-body">
                <span className="conv-title">{c.title}</span>
                <span className="conv-preview">{c.preview}</span>
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="sb-foot">
        <button className="theme-toggle" onClick={onTheme} title="Toggle theme">
          <Icon name={theme === "dark" ? "sun" : "moon"} size={15}/>
          {!collapsed && <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>}
        </button>
        {!collapsed && (
          <div className="profile">
            <div className="avatar">AK</div>
            <div className="profile-meta">
              <div className="profile-name">{data.identity.name}</div>
              <div className="profile-role">Open to roles</div>
            </div>
            <div className="online-dot"></div>
          </div>
        )}
      </div>
    </aside>
  );
};

// ----- Welcome screen -----
const Welcome = ({ data, onPick }) => {
  return (
    <div className="welcome">
      <div className="welcome-inner">
        <div className="welcome-badge">
          <span className="pulse"></span>
          <span>Online · ready to chat</span>
        </div>
        <h1 className="welcome-title">
          Hey, I'm <span className="accent">{data.identity.name.split(" ")[0]}</span>.
        </h1>
        <p className="welcome-sub">
          {data.identity.tagline} Ask me anything — or pick a thread on the left.
        </p>

        <div className="suggestions">
          {data.suggestions.map((s, i) => (
            <button key={i} className="suggestion" onClick={() => onPick(s.prompt)}>
              <span className="sug-icon"><Icon name={s.icon} size={16}/></span>
              <span className="sug-label">{s.label}</span>
              <span className="sug-arrow"><Icon name="arrow" size={14}/></span>
            </button>
          ))}
        </div>

        <div className="welcome-tip">
          <Icon name="slash" size={13}/>
          <span>Try slash commands: <code>/projects</code> <code>/resume</code> <code>/hire</code> <code>/contact</code></span>
        </div>
      </div>
    </div>
  );
};

// ----- Tool-call block -----
const ToolCalls = ({ steps, onDone }) => {
  const [shown, setShown] = React.useState(0);
  React.useEffect(() => {
    if (shown >= steps.length) { onDone && onDone(); return; }
    const t = setTimeout(() => setShown(s => s + 1), 380);
    return () => clearTimeout(t);
  }, [shown, steps.length]);
  return (
    <div className="tools">
      {steps.slice(0, shown).map((s, i) => (
        <div key={i} className={"tool-row " + (i === shown - 1 && shown < steps.length ? "" : "done")}>
          <span className="tool-dot">
            {i < shown - 1 || shown >= steps.length ? <Icon name="check" size={11}/> : <span className="spinner"/>}
          </span>
          <span className="tool-label">{s}</span>
        </div>
      ))}
    </div>
  );
};

// ----- Streaming text block -----
const StreamText = ({ content, onDone }) => {
  const [out, done] = useStream(content, 10, true);
  React.useEffect(() => { if (done) onDone && onDone(); }, [done]);
  return <p className="msg-text">{renderInline(out)}{!done && <span className="caret"/>}</p>;
};

// ----- Project mini-card (inline in chat) -----
const ProjectMini = ({ project, onOpen }) => (
  <button className="proj-mini" onClick={() => onOpen(project.id)}>
    <div className="proj-mini-thumb">
      <div className="proj-thumb-glyph">{project.name.split(" ").map(w => w[0]).slice(0, 2).join("")}</div>
    </div>
    <div className="proj-mini-body">
      <div className="proj-mini-name">{project.name}</div>
      <div className="proj-mini-tag">{project.tag}</div>
      <div className="proj-mini-blurb">{project.blurb}</div>
    </div>
    <div className="proj-mini-arrow"><Icon name="arrow" size={14}/></div>
  </button>
);

// ----- Render a single block in a message -----
const Block = ({ block, data, onDone, onOpenProject, onOpenResume }) => {
  switch (block.type) {
    case "tools":
      return <ToolCalls steps={block.steps} onDone={onDone}/>;
    case "text":
      return <StreamText content={block.content} onDone={onDone}/>;
    case "list":
      return (
        <ul className="msg-list">
          {block.items.map((it, i) => <li key={i}>{renderInline(it)}</li>)}
        </ul>
      );
    case "callout":
      return (
        <div className={"callout tone-" + (block.tone || "muted")}>
          <div className="callout-title">{block.title}</div>
          <div className="callout-body">{renderInline(block.content)}</div>
        </div>
      );
    case "projectGrid": {
      const projs = block.ids.map(id => data.projects.find(p => p.id === id)).filter(Boolean);
      return (
        <div className="proj-grid">
          {projs.map(p => <ProjectMini key={p.id} project={p} onOpen={onOpenProject}/>)}
        </div>
      );
    }
    case "timeline":
      return (
        <ol className="timeline">
          {block.items.map((it, i) => (
            <li key={i}>
              <span className="t-dot"/>
              <div className="t-body">
                <div className="t-period">{it.period}</div>
                <div className="t-role">{it.role}</div>
                <div className="t-detail">{it.detail}</div>
              </div>
            </li>
          ))}
        </ol>
      );
    case "skillGroups":
      return (
        <div className="skill-groups">
          {block.groups.map((g, i) => (
            <div key={i} className="skill-group">
              <div className="sg-head">
                <span className="sg-name">{g.name}</span>
                <span className="sg-level">{g.level}%</span>
              </div>
              <div className="sg-bar"><div className="sg-fill" style={{width: g.level + "%"}}/></div>
              <div className="sg-tags">
                {g.items.map((t, j) => <span key={j} className="sg-tag">{t}</span>)}
              </div>
            </div>
          ))}
        </div>
      );
    case "contactCards":
      return (
        <div className="contact-cards">
          <a className="contact-card" href={"mailto:" + data.identity.links.email}>
            <Icon name="mail" size={16}/>
            <div><div className="cc-label">Email</div><div className="cc-value">{data.identity.links.email}</div></div>
            <Icon name="external" size={13}/>
          </a>
          <a className="contact-card" href={data.identity.links.linkedin} target="_blank" rel="noreferrer">
            <Icon name="user" size={16}/>
            <div><div className="cc-label">LinkedIn</div><div className="cc-value">/in/kumawatamit</div></div>
            <Icon name="external" size={13}/>
          </a>
          <a className="contact-card" href={data.identity.links.github} target="_blank" rel="noreferrer">
            <Icon name="folder" size={16}/>
            <div><div className="cc-label">GitHub</div><div className="cc-value">@amitkumawat28</div></div>
            <Icon name="external" size={13}/>
          </a>
        </div>
      );
    case "resumeCard":
      return (
        <div className="resume-card" onClick={() => onOpenResume()}>
          <div className="rc-thumb"><Icon name="file" size={22}/></div>
          <div className="rc-body">
            <div className="rc-name">Amit_Kumawat_CV.pdf</div>
            <div className="rc-meta">PDF · click to preview</div>
          </div>
          <a className="rc-download" href={data.identity.cvPath} download onClick={e => e.stopPropagation()}>
            <Icon name="download" size={15}/>
          </a>
        </div>
      );
    case 'aiStream':
      return (
        <p className="msg-text">
          {block.content ? renderInline(block.content) : null}
          {!block.done && <span className="caret"/>}
        </p>
      );
    default:
      return null;
  }
};

// ----- Message (assistant or user) -----
const Message = ({ msg, data, onOpenProject, onOpenResume }) => {
  const blockCount = msg.blocks?.length ?? 0;
  const [revealed, setRevealed] = React.useState(msg.role === "user" ? 0 : 1);
  const advance = () => setRevealed(r => Math.min(r + 1, blockCount));
  return (
    <div className={"msg msg-" + msg.role}>
      {msg.role === "assistant" && (
        <div className="msg-avatar"><Icon name="bot" size={16}/></div>
      )}
      <div className="msg-content">
        {msg.role === "user" && <div className="msg-bubble">{msg.text}</div>}
        {msg.role === "assistant" && msg.blocks.slice(0, revealed).map((b, i) => (
          <Block
            key={i}
            block={b}
            data={data}
            onDone={i === revealed - 1 ? advance : undefined}
            onOpenProject={onOpenProject}
            onOpenResume={onOpenResume}
          />
        ))}
      </div>
    </div>
  );
};

// ----- Composer -----
const Composer = ({ onSend }) => {
  const [v, setV] = React.useState("");
  const [showSlash, setShowSlash] = React.useState(false);
  const ref = React.useRef(null);

  const slashOptions = [
    { cmd: "/about",      desc: "Bio and intro" },
    { cmd: "/projects",   desc: "Case studies" },
    { cmd: "/experience", desc: "Career timeline" },
    { cmd: "/skills",     desc: "Skill matrix" },
    { cmd: "/hire",       desc: "The pitch" },
    { cmd: "/resume",     desc: "Download CV" },
    { cmd: "/contact",    desc: "Reach me" }
  ];

  const submit = (text) => {
    const t = (text ?? v).trim();
    if (!t) return;
    onSend(t);
    setV("");
    setShowSlash(false);
  };

  const filteredSlash = v.startsWith("/")
    ? slashOptions.filter(o => o.cmd.startsWith(v.toLowerCase()))
    : slashOptions;

  return (
    <div className="composer-wrap">
      {showSlash && filteredSlash.length > 0 && (
        <div className="slash-menu">
          <div className="slash-head">Slash commands</div>
          {filteredSlash.map(o => (
            <button key={o.cmd} className="slash-item" onClick={() => submit(o.cmd)}>
              <span className="slash-cmd">{o.cmd}</span>
              <span className="slash-desc">{o.desc}</span>
            </button>
          ))}
        </div>
      )}
      <div className="composer">
        <textarea
          ref={ref}
          value={v}
          onChange={e => { setV(e.target.value); setShowSlash(e.target.value.startsWith("/")); }}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
            if (e.key === "/" && !v) setShowSlash(true);
            if (e.key === "Escape") setShowSlash(false);
          }}
          rows={1}
          placeholder="Ask anything about Amit… or type / for commands"
        />
        <div className="composer-tools">
          <button className="comp-chip" onClick={() => setShowSlash(s => !s)} title="Slash commands">
            <Icon name="slash" size={13}/>
            <span>Commands</span>
          </button>
          <div className="spacer"/>
          <button className="send-btn" onClick={() => submit()} disabled={!v.trim()}>
            <Icon name="send" size={15}/>
          </button>
        </div>
      </div>
      <div className="composer-foot">
        Portfolio chat · canned responses with love · press <kbd>↵</kbd> to send
      </div>
    </div>
  );
};

// ----- Artifact panel -----
const ArtifactPanel = ({ artifact, data, onClose }) => {
  if (!artifact) return null;
  const renderBody = () => {
    if (artifact.kind === "project") {
      const p = data.projects.find(x => x.id === artifact.id);
      if (!p) return null;
      return (
        <>
          <div className="art-hero">
            <div className="art-hero-glyph">{p.name.split(" ").map(w => w[0]).slice(0, 2).join("")}</div>
            <div className="art-tag">{p.tag}</div>
          </div>
          <h2 className="art-title">{p.name}</h2>
          <p className="art-blurb">{p.blurb}</p>
          <div className="art-section-label">Stack</div>
          <div className="art-chips">
            {p.stack.map((s, i) => <span key={i} className="art-chip">{s}</span>)}
          </div>
          <div className="art-section-label">Highlights</div>
          <ul className="art-list">
            {p.highlights.map((h, i) => <li key={i}>{h}</li>)}
          </ul>
          {p.link && (
            <a className="art-link" href={p.link} target="_blank" rel="noreferrer">
              <span>Open live</span><Icon name="external" size={14}/>
            </a>
          )}
        </>
      );
    }
    if (artifact.kind === "resume") {
      return (
        <>
          <div className="art-hero resume-hero">
            <Icon name="file" size={40}/>
          </div>
          <h2 className="art-title">Amit Kumawat — CV</h2>
          <p className="art-blurb">PDF · {data.identity.role}</p>
          <a className="art-link" href={data.identity.cvPath} download>
            <Icon name="download" size={14}/><span>Download PDF</span>
          </a>
          <div className="art-section-label">Preview</div>
          <div className="pdf-frame">
            <iframe src={data.identity.cvPath} title="CV preview"/>
          </div>
        </>
      );
    }
    return null;
  };

  return (
    <aside className="artifact">
      <div className="art-head">
        <div className="art-head-label">
          <Icon name="file" size={14}/>
          <span>Artifact</span>
        </div>
        <button className="icon-btn" onClick={onClose}><Icon name="close" size={16}/></button>
      </div>
      <div className="art-body">{renderBody()}</div>
    </aside>
  );
};

Object.assign(window, {
  Icon, Sidebar, Welcome, Message, Composer, ArtifactPanel, renderInline
});
