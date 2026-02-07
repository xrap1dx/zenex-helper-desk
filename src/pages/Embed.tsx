import { useState, useEffect } from "react";
import { MessageCircle, X, Minimize2 } from "lucide-react";
import { EmbedChatWindow } from "@/components/chat/EmbedChatWindow";
import { userSupabase as supabase } from "@/lib/supabaseClient";

export default function Embed() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [agentsOnline, setAgentsOnline] = useState(false);

  // Check for mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Check if any agents are actively online (last_seen within 2 minutes)
  useEffect(() => {
    const checkAgents = async () => {
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("staff_public")
        .select("is_online, last_seen, role")
        .eq("is_online", true)
        .gte("last_seen", twoMinutesAgo);
      // Only count non-affiliate staff
      const agents = (data || []).filter(s => s.role !== "affiliate");
      setAgentsOnline(agents.length > 0);
    };
    
    checkAgents();
    const interval = setInterval(checkAgents, 30000);
    return () => clearInterval(interval);
  }, []);

  // Prevent body scroll when chat is open on mobile
  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
      document.body.style.height = "100%";
    } else {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.height = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.height = "";
    };
  }, [isOpen, isMobile]);

  const chatWindowStyle: React.CSSProperties = isMobile && isOpen
    ? {
        pointerEvents: "auto",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        width: "100%",
        height: "100%",
        borderRadius: 0,
        overflow: "hidden",
        backgroundColor: "#0a0d1f",
        animation: "fadeIn 0.15s ease-out forwards",
      }
    : {
        pointerEvents: "auto",
        position: "fixed",
        bottom: "80px",
        right: "16px",
        zIndex: 9999,
        width: "360px",
        maxWidth: "calc(100vw - 32px)",
        height: "480px",
        maxHeight: "calc(100vh - 120px)",
        borderRadius: "12px",
        overflow: "hidden",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        backgroundColor: "#0a0d1f",
        animation: "scaleIn 0.15s ease-out forwards",
      };

  return (
    <>
      <style>{`
        html, body, #root {
          background: transparent !important;
          background-color: transparent !important;
        }
        * {
          box-sizing: border-box;
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      <div style={{ 
        position: "fixed", 
        inset: 0, 
        background: "transparent",
        backgroundColor: "transparent",
        pointerEvents: "none"
      }}>
        {/* Chat Window */}
        {isOpen && (
          <div style={chatWindowStyle}>
            {/* Header */}
            <div 
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: isMobile ? "14px 16px" : "10px 14px",
                backgroundColor: "#0d1025",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: agentsOnline ? "#22c55e" : "#ef4444",
                  flexShrink: 0,
                }} />
                <span style={{ 
                  fontWeight: 600, 
                  color: "#fff", 
                  fontSize: "14px",
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" 
                }}>
                  Zenex Support
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                {!isMobile && (
                  <button
                    style={{
                      height: "28px",
                      width: "28px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "6px",
                      color: "rgba(255,255,255,0.6)",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      transition: "background 0.15s",
                    }}
                    onClick={() => setIsMinimized(!isMinimized)}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                  >
                    <Minimize2 style={{ height: "14px", width: "14px" }} />
                  </button>
                )}
                <button
                  style={{
                    height: "28px",
                    width: "28px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "6px",
                    color: "rgba(255,255,255,0.6)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onClick={() => setIsOpen(false)}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                >
                  <X style={{ height: "14px", width: "14px" }} />
                </button>
              </div>
            </div>

            {/* Chat Content */}
            {!isMinimized && (
              <div style={{ 
                backgroundColor: "#0a0d1f", 
                height: isMobile ? "calc(100% - 52px)" : "calc(100% - 44px)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}>
                <EmbedChatWindow agentsOnline={agentsOnline} isMobile={isMobile} />
              </div>
            )}
          </div>
        )}

        {/* Toggle Button */}
        {!(isOpen && isMobile) && (
          <button
            onClick={() => {
              setIsOpen(!isOpen);
              setIsMinimized(false);
            }}
            style={{
              pointerEvents: "auto",
              position: "fixed",
              bottom: "16px",
              right: "16px",
              zIndex: 9998,
              width: "52px",
              height: "52px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "transform 0.15s ease",
              transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
              background: "#6366f1",
              border: "none",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = isOpen ? "rotate(90deg) scale(1.05)" : "scale(1.05)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = isOpen ? "rotate(90deg)" : "rotate(0deg)"}
          >
            {isOpen ? (
              <X style={{ height: "22px", width: "22px", color: "#fff" }} />
            ) : (
              <MessageCircle style={{ height: "22px", width: "22px", color: "#fff" }} />
            )}
          </button>
        )}
      </div>
    </>
  );
}
