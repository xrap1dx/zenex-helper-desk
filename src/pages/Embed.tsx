import { useState } from "react";
import { MessageCircle, X, Minimize2 } from "lucide-react";
import { EmbedChatWindow } from "@/components/chat/EmbedChatWindow";
import { cn } from "@/lib/utils";

export default function Embed() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  return (
    <div className="fixed inset-0 pointer-events-none">
      {/* Chat Window */}
      {isOpen && (
        <div
          className={cn(
            "pointer-events-auto fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)] rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-[#0f1229]",
            isMinimized && "h-14"
          )}
          style={{
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 30px rgba(0, 217, 255, 0.1)"
          }}
        >
          {/* Header */}
          <div 
            className="flex items-center justify-between px-4 py-3"
            style={{
              background: "linear-gradient(135deg, rgba(0, 217, 255, 0.2), rgba(120, 70, 255, 0.2))"
            }}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="font-semibold text-white">Zenex Support</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                className="h-8 w-8 flex items-center justify-center rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                onClick={() => setIsMinimized(!isMinimized)}
              >
                <Minimize2 className="h-4 w-4" />
              </button>
              <button
                className="h-8 w-8 flex items-center justify-center rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
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
        className={cn(
          "pointer-events-auto fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105",
          isOpen && "rotate-90"
        )}
        style={{
          background: "linear-gradient(135deg, rgba(0, 217, 255, 0.8), rgba(120, 70, 255, 0.8))",
          boxShadow: "0 8px 32px rgba(0, 217, 255, 0.3)"
        }}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <MessageCircle className="h-6 w-6 text-white" />
        )}
      </button>
    </div>
  );
}
