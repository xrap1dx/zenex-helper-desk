import { useState, useEffect } from "react";
import { MessageCircle, X, Minimize2 } from "lucide-react";
import { EmbedChatWindow } from "@/components/chat/EmbedChatWindow";
import { userSupabase as supabase } from "@/lib/supabaseClient";

export default function Embed() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [agentsOnline, setAgentsOnline] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const checkAgents = async () => {
      const { data } = await supabase
        .from("staff_members")
        .select("status, is_active, is_suspended")
        .eq("status", "online")
        .eq("is_active", true)
        .eq("is_suspended", false);
      setAgentsOnline((data || []).length > 0);
    };
    checkAgents();
    const interval = setInterval(checkAgents, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
    } else {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    };
  }, [isOpen, isMobile]);

  const chatWindowStyle: React.CSSProperties =
    isMobile && isOpen
      ? { pointerEvents: "auto", position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, width: "100%", height: "100%", borderRadius: 0, overflow: "hidden", backgroundColor: "#0a0d1f" }
      : { pointerEvents: "auto", position: "fixed", bottom: "80px", right: "16px", zIndex: 9999, width: "360px", maxWidth: "calc(100vw - 32px)", height: "480px", maxHeight: "calc(100vh - 120px)", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "#0a0d1f" };

  return (
    <>
      <style>{`html,body,#root{background:transparent!important}*{box-sizing:border-box}@keyframes scaleIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}`}</style>
      <div style={{ position: "fixed", inset: 0, background: "transparent", pointerEvents: "none" }}>
        {isOpen && (
          <div style={chatWindowStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "14px 16px" : "10px 14px", backgroundColor: "#0d1025", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: agentsOnline ? "#22c55e" : "#ef4444", flexShrink: 0 }} />
                <div>
                  <span style={{ fontWeight: 600, color: "#fff", fontSize: "14px", fontFamily: "-apple-system, sans-serif", display: "block" }}>Zenex Support</span>
                  <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>Start a conversation</span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                {!isMobile && (
                  <button onClick={() => setIsMinimized(!isMinimized)} style={{ height: "28px", width: "28px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "6px", color: "rgba(255,255,255,0.6)", background: "transparent", border: "none", cursor: "pointer" }}>
                    <Minimize2 style={{ height: "14px", width: "14px" }} />
                  </button>
                )}
                <button onClick={() => setIsOpen(false)} style={{ height: "28px", width: "28px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "6px", color: "rgba(255,255,255,0.6)", background: "transparent", border: "none", cursor: "pointer" }}>
                  <X style={{ height: "14px", width: "14px" }} />
                </button>
              </div>
            </div>
            {!isMinimized && (
              <div style={{ backgroundColor: "#0a0d1f", height: isMobile ? "calc(100% - 52px)" : "calc(100% - 44px)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <EmbedChatWindow agentsOnline={agentsOnline} isMobile={isMobile} />
              </div>
            )}
          </div>
        )}
        {!(isOpen && isMobile) && (
          <button
            onClick={() => { setIsOpen(!isOpen); setIsMinimized(false); }}
            style={{ pointerEvents: "auto", position: "fixed", bottom: "16px", right: "16px", zIndex: 9998, width: "52px", height: "52px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "#6366f1", border: "none", cursor: "pointer", transition: "transform 0.15s", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}
          >
            {isOpen ? <X style={{ height: "22px", width: "22px", color: "#fff" }} /> : <MessageCircle style={{ height: "22px", width: "22px", color: "#fff" }} />}
          </button>
        )}
      </div>
    </>
  );
}
