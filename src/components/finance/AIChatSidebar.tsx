import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Mic, MicOff, Lock, Sparkles, X, Volume2 } from "lucide-react";
import { useAuth, useAuthFetch } from "@/lib/auth-context";

const API_BASE = "http://localhost:3000/api";

interface ChatMsg {
  id: number | string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
  expense?: {
    amount: number;
    category: string;
    note: string;
    date: string;
  };
}

interface Props {
  onExpenseAdded?: () => void;
  onUpgrade?: () => void;
}

export default function AIChatSidebar({ onExpenseAdded, onUpgrade }: Props) {
  const { isSubscribed, isAuthenticated } = useAuth();
  const authFetch = useAuthFetch();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load chat history
  useEffect(() => {
    if (isSubscribed && isAuthenticated) {
      authFetch(`${API_BASE}/chat/history`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setMessages(data);
        })
        .catch(() => {});
    }
  }, [isSubscribed, isAuthenticated]); // eslint-disable-line

  // Send text message
  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return;

    const userMsg: ChatMsg = {
      id: Date.now(),
      role: "user",
      content: input,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await authFetch(`${API_BASE}/chat/message`, {
        method: "POST",
        body: JSON.stringify({ message: input }),
      });

      const data = await res.json();

      const assistantMsg: ChatMsg = {
        id: Date.now() + 1,
        role: "assistant",
        content: data.message || data.error || "Something went wrong",
        expense: data.expense,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      if (data.type === "expense" && onExpenseAdded) {
        onExpenseAdded();
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: "assistant", content: "❌ Network error. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, authFetch, onExpenseAdded]);

  // Voice recording — detect supported MIME types with fallback
  const getSupportedMimeType = () => {
    const types = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4",
      "audio/wav",
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return ""; // Let browser choose default
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mimeType = getSupportedMimeType();
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const actualType = mimeType || mediaRecorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: actualType });
        await sendVoice(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("NotAllowed") || msg.includes("Permission")) {
        alert("Microphone access denied. Please allow microphone permission.");
      } else {
        alert(`Could not start recording: ${msg}`);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const sendVoice = async (blob: Blob) => {
    // Validate blob before sending
    if (!blob || blob.size < 100) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), role: "assistant", content: "❌ Recording too short. Please hold the mic button and speak for at least 2 seconds." },
      ]);
      return;
    }

    setLoading(true);
    const userMsg: ChatMsg = {
      id: Date.now(),
      role: "user",
      content: "🎤 Sending voice message...",
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const formData = new FormData();
      // Use the actual blob type for proper file extension
      const ext = blob.type.includes("mp4") ? "mp4" : blob.type.includes("ogg") ? "ogg" : "webm";
      formData.append("audio", blob, `recording.${ext}`);

      const res = await authFetch(`${API_BASE}/chat/voice`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      // Check for error responses from backend
      if (!res.ok) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === userMsg.id
              ? { ...m, content: "🎤 Voice message" }
              : m
          )
        );
        setMessages((prev) => [
          ...prev,
          { id: Date.now() + 1, role: "assistant", content: `❌ ${data.error || "Voice processing failed"}` },
        ]);
        return;
      }

      // Update user message with transcription
      setMessages((prev) =>
        prev.map((m) =>
          m.id === userMsg.id
            ? { ...m, content: `🎤 ${data.transcription || "Voice message"}` }
            : m
        )
      );

      const assistantMsg: ChatMsg = {
        id: Date.now() + 1,
        role: "assistant",
        content: data.message || "Could not process voice",
        expense: data.expense,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      if (data.type === "expense" && onExpenseAdded) {
        onExpenseAdded();
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: "assistant", content: `❌ Network error: ${errMsg}. Check if backend is running.` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  // ─── Locked State (non-subscribed) ────────────────────────────
  if (!isSubscribed) {
    return (
      <div className="page-transition max-w-lg mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
            <Lock size={40} className="text-amber-600" />
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center shadow-lg animate-bounce">
            <Sparkles size={14} className="text-white" />
          </div>
        </div>

        <h2 className="text-2xl font-serif text-foreground mb-2">AI Chat Assistant</h2>
        <p className="text-muted-foreground text-sm max-w-xs mb-6 leading-relaxed">
          Unlock voice-powered expense tracking in Bangla & English.
          Just speak or type — AI adds expenses automatically!
        </p>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 mb-6 w-full max-w-sm">
          <div className="text-sm font-semibold text-blue-900 mb-3">Pro Features Include:</div>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> AI text chat (Bangla + English)
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Voice-to-expense (speak to add)
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Smart category detection
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Unlimited chat history
            </li>
          </ul>
        </div>

        <div className="text-center mb-4">
          <div className="text-3xl font-bold text-foreground">৳299<span className="text-base font-normal text-muted-foreground">/month</span></div>
        </div>

        <button
          onClick={onUpgrade}
          className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-8 py-3.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98]"
        >
          Upgrade to Pro ✨
        </button>
      </div>
    );
  }

  // ─── Chat UI (subscribed) ─────────────────────────────────────
  return (
    <div className="page-transition flex flex-col h-[calc(100vh-4rem)] max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-border mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md">
          <Sparkles size={18} className="text-white" />
        </div>
        <div>
          <h2 className="text-lg font-serif text-foreground">AI Assistant</h2>
          <p className="text-xs text-muted-foreground">Type or speak to add expenses • বাংলা supported</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
        {messages.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Volume2 size={32} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium">Start a conversation!</p>
            <p className="text-xs mt-1 opacity-70">
              Try: "আজকে ১৫০ টাকার বিরিয়ানি খেলাম" or "Spent 200tk on Uber"
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-secondary text-foreground rounded-bl-md"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>

              {/* Expense card */}
              {msg.expense && (
                <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-3 text-green-800">
                  <div className="flex items-center gap-2 text-xs font-semibold mb-1">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Expense Added
                  </div>
                  <div className="text-lg font-bold">৳{msg.expense.amount.toLocaleString()}</div>
                  <div className="text-xs opacity-80">
                    {msg.expense.category} • {msg.expense.note} • {msg.expense.date}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="pt-4 border-t border-border mt-auto">
        {/* Recording indicator */}
        {isRecording && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 mb-3 animate-in fade-in">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm text-red-700 font-medium flex-1">
              Recording... {formatTime(recordingTime)}
            </span>
            <button
              onClick={stopRecording}
              className="text-red-600 hover:text-red-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        )}

        <div className="flex gap-2">
          {/* Voice button */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={loading}
            className={`p-3 rounded-xl transition-all duration-200 ${
              isRecording
                ? "bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse"
                : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
            } disabled:opacity-50`}
            title={isRecording ? "Stop recording" : "Start voice recording (Bangla)"}
          >
            {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* Text input */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="Type expense or ask a question..."
              disabled={loading || isRecording}
              className="w-full bg-secondary border border-border rounded-xl py-3 px-4 pr-12 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim() || isRecording}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Send size={16} />
            </button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground/60 mt-2 text-center">
          🎤 Click mic to speak in Bangla • Type in English or বাংলা
        </p>
      </div>
    </div>
  );
}
