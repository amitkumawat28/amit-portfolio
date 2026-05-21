// Portfolio main app — wires sidebar, chat, composer, artifact panel together.

const { useState, useEffect, useRef } = React;

const App = () => {
  const data = window.PORTFOLIO_DATA;
  const [theme, setTheme] = useState(() => localStorage.getItem("ak-theme") || "light");
  const [palette, setPalette] = useState("cobalt");
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

  /* AI streaming — re-enable when Gemini quota is sorted
  const streamAI = async (text, aiId) => { ... };
  */

  const sendMessage = (text) => {
    const userMsg = { id: Date.now(), role: "user", text };
    const key = resolveResponseKey(text);
    const responseKey = key || "fallback";
    const blocks = data.responses[responseKey];
    const aiMsg = { id: Date.now() + 1, role: "assistant", blocks, key: responseKey };
    setMessages(m => [...m, userMsg, aiMsg]);
    if (key && data.conversations.find(c => c.id === key)) setActiveId(key);
    if (responseKey === "resume") setArtifact({ kind: "resume" });
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
            <span className="meta-chip desktop-only"><span className="dot live"/>canned · offline</span>
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
