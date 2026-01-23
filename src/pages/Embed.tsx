import { useState, useEffect } from "react";
import { MessageCircle, X, Minimize2 } from "lucide-react";
import { EmbedChatWindow } from "@/components/chat/EmbedChatWindow";

export default function Embed() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Make the page background transparent for iframe embedding
  useEffect(() => {
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
  }, []);

  return (
    <div style={{ 
      position: "fixed", 
      inset: 0, 
      background: "transparent",
      pointerEvents: "none"
    }}>
      {/* Chat Window */}
      {isOpen && (
        <div
          style={{
            pointerEvents: "auto",
            position: "fixed",
            bottom: "96px",
            right: "24px",
            zIndex: 50,
            width: "380px",
            maxWidth: "calc(100vw - 48px)",
            borderRadius: "16px",
            overflow: "hidden",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 30px rgba(0, 217, 255, 0.1)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            background: "#0f1229",
            height: isMinimized ? "56px" : "auto"
          }}
        >
          {/* Header */}
          <div 
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              background: "linear-gradient(135deg, rgba(0, 217, 255, 0.2), rgba(120, 70, 255, 0.2))"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#4ade80",
                animation: "pulse 2s infinite"
              }} />
              <span style={{ fontWeight: 600, color: "#fff" }}>Zenex Support</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <button
                style={{
                  height: "32px",
                  width: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "6px",
                  color: "rgba(255,255,255,0.8)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer"
                }}
                onClick={() => setIsMinimized(!isMinimized)}
              >
                <Minimize2 style={{ height: "16px", width: "16px" }} />
              </button>
              <button
                style={{
                  height: "32px",
                  width: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "6px",
                  color: "rgba(255,255,255,0.8)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer"
                }}
                onClick={() => setIsOpen(false)}
              >
                <X style={{ height: "16px", width: "16px" }} />
              </button>
            </div>
          </div>

          {/* Chat Content */}
          {!isMinimized && <EmbedChatWindow />}
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setIsMinimized(false);
        }}
        style={{
          pointerEvents: "auto",
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 50,
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.3s",
          transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
          background: "linear-gradient(135deg, rgba(0, 217, 255, 0.9), rgba(120, 70, 255, 0.9))",
          boxShadow: "0 8px 32px rgba(0, 217, 255, 0.4)",
          border: "none",
          cursor: "pointer"
        }}
      >
        {isOpen ? (
          <X style={{ height: "24px", width: "24px", color: "#fff" }} />
        ) : (
          <MessageCircle style={{ height: "24px", width: "24px", color: "#fff" }} />
        )}
      </button>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
