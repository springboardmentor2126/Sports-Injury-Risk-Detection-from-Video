"use client";
import { useState } from "react";
import { chatApi } from "@/lib/api";

interface GlobalChatbotProps {
  viewerRole: string;
  athleteFirstName?: string;
  contextType: "dashboard" | "session";
  sessionId?: string; // required if contextType is "session"
}

export default function GlobalChatbot({ viewerRole, athleteFirstName, contextType, sessionId }: GlobalChatbotProps) {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const handleOpen = () => {
    setChatOpen(true);
    if (chatMessages.length === 0) {
      if (contextType === "session") {
        const greetings: Record<string, string> = {
          coach: `Hello Coach! I've analysed ${athleteFirstName ?? "the athlete"}'s latest session. Ask me about training load, readiness, or technique adjustments.`,
          physiotherapist: `Hello! I have the clinical data from ${athleteFirstName ?? "the athlete"}'s latest session ready. Ask me about rehab protocols, biomechanical corrections, or injury risk.`,
          scientist: `Hello! The XGBoost model has processed ${athleteFirstName ?? "the athlete"}'s session. Ask me about model probabilities, feature analysis, or statistical patterns.`,
          athlete: `Hi ${athleteFirstName ?? "there"}! Your session has been analysed. Ask me anything about your movement, injury risk, or recovery plan.`,
        };
        setChatMessages([{ role: "ai", text: greetings[viewerRole] ?? greetings.athlete }]);
      } else {
        const greetings: Record<string, string> = {
          coach: `Hello Coach! I have your full team roster data ready. Ask me who is fit to play, who is at high risk, or who needs rest.`,
          physiotherapist: `Hello! I'm monitoring the entire team's clinical status. Ask me about overall injury trends, recovery timelines, or high-risk athletes.`,
          scientist: `Hello! I can provide a macro-level overview of the team's biomechanical trends and XGBoost risk distributions. What would you like to know?`,
          athlete: `Hi ${athleteFirstName ?? "there"}! I'm tracking your overall progress across all your sessions. Ask me how you're improving, or what you should focus on next.`,
        };
        setChatMessages([{ role: "ai", text: greetings[viewerRole] ?? greetings.athlete }]);
      }
    }
  };

  const handleSend = async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", text: msg }]);
    setChatLoading(true);
    try {
      let res;
      if (contextType === "session" && sessionId) {
        res = await chatApi.sendMessage(sessionId, msg, viewerRole);
      } else {
        res = await chatApi.sendDashboardMessage(msg, viewerRole);
      }
      setChatMessages((prev) => [...prev, { role: "ai", text: res.response }]);
    } catch {
      setChatMessages((prev) => [...prev, { role: "ai", text: "Sorry, I could not get a response. Please try again." }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 1000 }}>
      {!chatOpen ? (
        <button
          onClick={handleOpen}
          style={{
            width: "52px", height: "52px", borderRadius: "50%", background: "#7c3aed", border: "none",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px",
            boxShadow: "0 4px 16px rgba(124,58,237,0.35)", transition: "transform 0.15s"
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          🤖
        </button>
      ) : (
        <div style={{
          width: "340px", height: "480px", background: "#fff", borderRadius: "16px",
          boxShadow: "0 8px 40px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column",
          overflow: "hidden", border: "1px solid #e2e8f0"
        }}>
          {/* Chat header */}
          <div style={{ background: "#7c3aed", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ color: "#fff", fontWeight: 700, fontSize: "14px", margin: 0 }}>🤖 Sporty</p>
              <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "11px", margin: 0, textTransform: "capitalize" }}>
                {viewerRole} mode · {contextType === "session" ? "Session data loaded" : "Global data loaded"}
              </p>
            </div>
            <button onClick={() => setChatOpen(false)} style={{ background: "none", border: "none", color: "#fff", fontSize: "18px", cursor: "pointer", lineHeight: 1, padding: "4px" }}>×</button>
          </div>
          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
            {chatMessages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                {m.role === "user" ? (
                  <div style={{ maxWidth: "82%", padding: "8px 12px", borderRadius: "12px 12px 0 12px", background: "#7c3aed", color: "#fff", fontSize: "13px", lineHeight: "1.5" }}>
                    {m.text}
                  </div>
                ) : (
                  /* AI response — render structured markdown */
                  <div style={{ maxWidth: "90%", padding: "10px 14px", borderRadius: "12px 12px 12px 0", background: "#f8fafc", border: "1px solid #e2e8f0", fontSize: "13px", lineHeight: "1.6", color: "#374151" }}>
                    {m.text.split("\n").map((line, li) => {
                      if (line.startsWith("## ")) {
                        return (
                          <div key={li} style={{ marginTop: li > 0 ? "10px" : "0", marginBottom: "4px" }}>
                            <p style={{ fontWeight: 800, fontSize: "12px", color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
                              {line.replace("## ", "")}
                            </p>
                            <div style={{ height: "1px", background: "#e2e8f0", marginTop: "3px" }} />
                          </div>
                        );
                      }
                      if (line.startsWith("- ") || line.startsWith("• ")) {
                        const content = line.replace(/^[-•] /, "");
                        return (
                          <div key={li} style={{ display: "flex", gap: "6px", marginTop: "3px" }}>
                            <span style={{ color: "#7c3aed", flexShrink: 0, marginTop: "1px" }}>•</span>
                            <span>{content.replace(/\*\*(.*?)\*\*/g, "$1")}</span>
                          </div>
                        );
                      }
                      if (line.trim() === "") return <div key={li} style={{ height: "4px" }} />;
                      // Inline bold: replace **text** with bold span
                      const parts = line.split(/\*\*(.*?)\*\*/g);
                      return (
                        <p key={li} style={{ margin: "2px 0" }}>
                          {parts.map((part, pi) =>
                            pi % 2 === 1 ? <strong key={pi}>{part}</strong> : part
                          )}
                        </p>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
            {chatLoading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ padding: "8px 14px", borderRadius: "12px 12px 12px 0", background: "#f1f5f9", fontSize: "13px", color: "#94a3b8" }}>Thinking...</div>
              </div>
            )}
          </div>
          {/* Input */}
          <div style={{ padding: "10px", borderTop: "1px solid #f1f5f9", display: "flex", gap: "8px" }}>
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend();
              }}
              placeholder={contextType === "session" ? "Ask about this session..." : "Ask about the team or your progress..."}
              style={{ flex: 1, padding: "8px 12px", borderRadius: "20px", border: "1px solid #e2e8f0", fontSize: "13px", fontFamily: "inherit", outline: "none" }}
            />
            <button
              disabled={chatLoading || !chatInput.trim()}
              onClick={handleSend}
              style={{
                width: "34px", height: "34px", borderRadius: "50%",
                background: chatLoading || !chatInput.trim() ? "#e2e8f0" : "#7c3aed", border: "none",
                cursor: chatLoading || !chatInput.trim() ? "not-allowed" : "pointer", fontSize: "16px",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
              }}
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
