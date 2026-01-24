interface TypingIndicatorProps {
  label?: string;
}

export function TypingIndicator({ label = "typing" }: TypingIndicatorProps) {
  return (
    <div style={{ 
      display: "flex", 
      alignItems: "center", 
      gap: "8px",
      padding: "8px 12px",
      color: "rgba(255,255,255,0.6)",
      fontSize: "12px"
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
