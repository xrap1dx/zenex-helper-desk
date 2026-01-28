import { useState, useEffect } from "react";
import { MessageCircle, X, Minimize2 } from "lucide-react";
import { EmbedChatWindow } from "@/components/chat/EmbedChatWindow";
import { supabase } from "@/integrations/supabase/client";

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

  // Check if any agents are online
  useEffect(() => {
    const checkAgents = async () => {
      const { data } = await supabase
        .from("staff_public")
        .select("is_online")
        .eq("is_online", true);
      setAgentsOnline((data?.length || 0) > 0);
    };
    
    checkAgents();
    const interval = setInterval(checkAgents, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Prevent body scroll when chat is open on mobile
  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen, isMobile]);

  // Force transparent background for iframe embedding
  useEffect(() => {
    document.documentElement.style.cssText = "background: transparent !important;";
    document.body.style.cssText = "background: transparent !important;";
    
    const root = document.getElementById("root");
    if (root) {
      root.style.cssText = "background: transparent !important;";
    }

    return () => {
      document.documentElement.style.cssText = "";
      document.body.style.cssText = "";
      if (root) root.style.cssText = "";
    };
  }, []);

  const chatWindowStyle: React.CSSProperties = isMobile && isOpen
    ? {
        pointerEvents: "auto",
        position: "fixed",
        inset: 0,
        zIndex: 50,
        width: "100%",
        height: "100%",
        borderRadius: 0,
        overflow: "hidden",
        backgroundColor: "#0a0d1f",
        animation: "scaleIn 0.2s ease-out forwards",
      }
    : {
        pointerEvents: "auto",
        position: "fixed",
        bottom: "88px",
        right: "16px",
        zIndex: 50,
        width: "380px",
        maxWidth: "calc(100vw - 32px)",
        maxHeight: "calc(100vh - 120px)",
        borderRadius: "12px",
        overflow: "hidden",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        backgroundColor: "#0a0d1f",
        animation: "scaleIn 0.2s ease-out forwards",
      };

  return (
    <>
      <style>{`
        html, body, #root {
          background: transparent !important;
          background-color: transparent !important;
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
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
                padding: isMobile ? "16px" : "12px 16px",
                backgroundColor: "#0d1025",
                borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: agentsOnline ? "#22c55e" : "#ef4444",
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
              <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
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
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)"}
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
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)"}
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
                height: isMobile ? "calc(100% - 56px)" : "auto",
                display: "flex",
                flexDirection: "column"
              }}>
                <EmbedChatWindow agentsOnline={agentsOnline} isMobile={isMobile} />
              </div>
            )}
          </div>
        )}

        {/* Toggle Button - Hidden when fullscreen mobile chat is open */}
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
              zIndex: 50,
              width: "52px",
              height: "52px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "transform 0.2s ease, background 0.2s ease",
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