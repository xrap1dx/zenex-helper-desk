interface TypingIndicatorProps {
  label?: string;
  variant?: "embed" | "dashboard";
}

export function TypingIndicator({ label = "typing", variant = "embed" }: TypingIndicatorProps) {
  if (variant === "dashboard") {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm animate-fade-in">
        <div className="flex gap-1">
          <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0s" }} />
          <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0.15s" }} />
          <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0.3s" }} />
        </div>
        <span>{label}</span>
      </div>
    );
  }

  return (
    <div style={{ 
      display: "flex", 
      alignItems: "center", 
      gap: "8px",
      padding: "8px 12px",
      color: "rgba(255,255,255,0.6)",
      fontSize: "13px"
    }}>
      <div style={{ display: "flex", gap: "3px" }}>
        <span 
          style={{ 
            width: "6px", 
            height: "6px", 
            borderRadius: "50%", 
            backgroundColor: "rgba(255,255,255,0.5)",
            animation: "typingBounce 1.4s infinite ease-in-out",
            animationDelay: "0s"
          }} 
        />
        <span 
          style={{ 
            width: "6px", 
            height: "6px", 
            borderRadius: "50%", 
            backgroundColor: "rgba(255,255,255,0.5)",
            animation: "typingBounce 1.4s infinite ease-in-out",
            animationDelay: "0.2s"
          }} 
        />
        <span 
          style={{ 
            width: "6px", 
            height: "6px", 
            borderRadius: "50%", 
            backgroundColor: "rgba(255,255,255,0.5)",
            animation: "typingBounce 1.4s infinite ease-in-out",
            animationDelay: "0.4s"
          }} 
        />
      </div>
      <span>{label}</span>
      <style>{`
        @keyframes typingBounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}