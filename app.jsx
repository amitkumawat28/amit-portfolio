// Portfolio main app — wires sidebar, chat, composer, artifact panel together.

const { useState, useEffect, useRef } = React;

const App = () => {
  const data = window.PORTFOLIO_DATA;
  const [theme, setTheme] = useState(() => localStorage.getItem("ak-theme") || "light");
  const [palette, setPalette] = useState(() => localStorage.getItem("ak-palette") || "terracotta");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [messages, setMessages] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [artifact, setArtifact] = useState(null);
  const threadRef = useRef(null);

  const isMobile = () => window.matchMedia("(max-width: 900px)").matches;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("ak-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.palette = palette;
    localStorage.setItem("ak-palette", palette);
  }, [palette]);

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages]);

  // Intent resolution
  const resolveResponseKey = (text) => {
    const t = text.toLowerCase().trim();
    // slash commands
    if (t.startsWith("/")) {
      const cmd = t.slice(1).split(" ")[0];
      if (data.responses[cmd]) return cmd;
    }
    // keyword intents
    for (const intent of data.intents) {
      for (const k of intent.keys) {
        if (t.includes(k)) return intent.to;
      }
    }
    return null;
  };

  const streamAI = async (text, aiId) => {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessages(m => m.map(msg => msg.id !== aiId ? msg : {
          ...msg, blocks: [{ type: 'aiStream', content: err.error || 'Something went wrong.', done: true }]
        }));
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6);
          if (raw === '[DONE]') {
            setMessages(m => m.map(msg => msg.id !== aiId ? msg : {
              ...msg, blocks: msg.blocks.map(b => b.type === 'aiStream' ? { ...b, done: true } : b)
            }));
            return;
          }
          try {
            const { text: chunk, error } = JSON.parse(raw);
            if (error) throw new Error(error);
            if (chunk) setMessages(m => m.map(msg => msg.id !== aiId ? msg : {
              ...msg, blocks: msg.blocks.map(b => b.type === 'aiStream' ? { ...b, content: b.content + chunk } : b)
            }));
          } catch {}
        }
      }
      setMessages(m => m.map(msg => msg.id !== aiId ? msg : {
        ...msg, blocks: msg.blocks.map(b => b.type === 'aiStream' ? { ...b, done: true } : b)
      }));
    } catch {
      setMessages(m => m.map(msg => msg.id !== aiId ? msg : {
        ...msg, blocks: [{ type: 'aiStream', content: 'Sorry, something went wrong. Try again.', done: true }]
      }));
    }
  };

  const sendMessage = (text) => {
    const userMsg = { id: Date.now(), role: "user", text };
    const key = resolveResponseKey(text);
    if (key === null) {
      const aiId = Date.now() + 1;
      setMessages(m => [...m, userMsg, { id: aiId, role: "assistant", blocks: [{ type: 'aiStream', content: '', done: false }] }]);
      streamAI(text, aiId);
    } else {
      const blocks = data.responses[key] || data.responses.fallback;
      setMessages(m => [...m, userMsg, { id: Date.now() + 1, role: "assistant", blocks, key }]);
      if (data.conversations.find(c => c.id === key)) setActiveId(key);
      if (key === "resume") setArtifact({ kind: "resume" });
    }
  };

  const pickConversation = (id) => {
    setActiveId(id);
    const conv = data.conversations.find(c => c.id === id);
    if (!conv) return;
    sendMessage(conv.title);
    if (isMobile()) setMobileNav(false);
  };

  const newChat = () => {
    setMessages([]);
    setActiveId(null);
    setArtifact(null);
    if (isMobile()) setMobileNav(false);
  };

  const openProject = (id) => setArtifact({ kind: "project", id });
  const openResume = () => setArtifact({ kind: "resume" });

  return (
    <div className={"app" + (mobileNav ? " mobile-nav-open" : "")}>
      <Sidebar
        data={data}
        collapsed={collapsed}
        onCollapse={() => setCollapsed(c => !c)}
        activeId={activeId}
        onPick={pickConversation}
        onNew={newChat}
        theme={theme}
        onTheme={() => setTheme(t => t === "dark" ? "light" : "dark")}
        palette={palette}
        onPalette={setPalette}
        mobileOpen={mobileNav}
        onMobileClose={() => setMobileNav(false)}
      />

      <div className="backdrop" onClick={() => setMobileNav(false)}/>

      <main className={"chat " + (artifact ? "with-artifact" : "")}>
        <header className="chat-head">
          <button className="icon-btn mobile-only menu-btn" onClick={() => setMobileNav(true)} aria-label="Open menu">
            <Icon name="menu" size={18}/>
          </button>
          <div className="chat-title">
            <span className="chat-title-mark"><Icon name="bot" size={14}/></span>
            <span>{activeId ? data.conversations.find(c => c.id === activeId)?.title : "New conversation"}</span>
          </div>
          <div className="chat-head-meta">
            <span className="meta-chip desktop-only"><span className="dot live"/>AI · live</span>
            <a className="meta-chip link" href={"mailto:" + data.identity.links.email}>
              <Icon name="mail" size={12}/><span className="meta-chip-text">Hire Amit</span>
            </a>
          </div>
        </header>

        <div className="thread" ref={threadRef}>
          {messages.length === 0 ? (
            <Welcome data={data} onPick={sendMessage}/>
          ) : (
            <div className="msgs">
              {messages.map(m => (
                <Message
                  key={m.id}
                  msg={m}
                  data={data}
                  onOpenProject={openProject}
                  onOpenResume={openResume}
                />
              ))}
            </div>
          )}
        </div>

        <Composer onSend={sendMessage}/>
      </main>

      <ArtifactPanel artifact={artifact} data={data} onClose={() => setArtifact(null)}/>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
