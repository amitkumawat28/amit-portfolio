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
  const msgsRef = useRef(null);

  const scrollToBottom = () => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  };

  const isMobile = () => window.matchMedia("(max-width: 900px)").matches;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("ak-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.palette = palette;
    localStorage.setItem("ak-palette", palette);
  }, [palette]);

  // Scroll on new message
  useEffect(scrollToBottom, [messages]);

  // Scroll as content grows (typewriter, block reveals)
  useEffect(() => {
    const el = msgsRef.current;
    if (!el) return;
    const ro = new ResizeObserver(scrollToBottom);
    ro.observe(el);
    return () => ro.disconnect();
  });

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

  const track = (event, params = {}) => {
    if (typeof gtag !== "undefined") gtag("event", event, params);
  };

  const sendMessage = (text) => {
    const userMsg = { id: Date.now(), role: "user", text };
    const key = resolveResponseKey(text);
    const responseKey = key || "fallback";
    const blocks = data.responses[responseKey];
    const aiMsg = { id: Date.now() + 1, role: "assistant", blocks, key: responseKey };
    setMessages(m => [...m, userMsg, aiMsg]);
    if (key && data.conversations.find(c => c.id === key)) setActiveId(key);
    if (responseKey === "resume") setArtifact({ kind: "resume" });
    track("chat_message", { response_key: responseKey, message: text.slice(0, 100) });
  };

  const pickConversation = (id) => {
    setActiveId(id);
    const conv = data.conversations.find(c => c.id === id);
    if (!conv) return;
    sendMessage(conv.title);
    track("sidebar_conversation", { conversation_id: id });
    if (isMobile()) setMobileNav(false);
  };

  const newChat = () => {
    setMessages([]);
    setActiveId(null);
    setArtifact(null);
    track("new_chat");
    if (isMobile()) setMobileNav(false);
  };

  const openProject = (id) => {
    setArtifact({ kind: "project", id });
    track("project_opened", { project_id: id });
  };
  const openResume = () => {
    setArtifact({ kind: "resume" });
    track("resume_opened");
  };

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
            <a className="meta-chip link mobile-only" href="https://wa.me/917023806259?text=Hi%20Amit%2C%20I%20visited%20your%20portfolio%20and%20would%20like%20to%20connect!" target="_blank" rel="noreferrer" style={{background:"#25D366",color:"#fff",borderColor:"#25D366"}} onClick={() => track("whatsapp_click")}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.118.553 4.103 1.522 5.83L.057 23.57a.5.5 0 0 0 .614.614l5.739-1.465A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.808 9.808 0 0 1-5.001-1.371l-.359-.213-3.722.951.968-3.619-.233-.372A9.818 9.818 0 1 1 12 21.818z"/></svg>
              <span className="meta-chip-text">WhatsApp</span>
            </a>
          </div>
        </header>

        <div className="thread" ref={threadRef}>
          {messages.length === 0 ? (
            <Welcome data={data} onPick={sendMessage}/>
          ) : (
            <div className="msgs" ref={msgsRef}>
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
