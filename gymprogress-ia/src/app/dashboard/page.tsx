"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { ProfileData, ProfileModal } from "@/components/modals/ProfileModal";
import {
  ClipboardList,
  Dumbbell,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Send,
  Sparkles,
  User,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type Conversation = {
  id: string;
  title: string;
  updatedAt: { seconds: number } | null;
};

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [message, setMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isComposerExpanded, setIsComposerExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");

  const [dailyUsage, setDailyUsage] = useState({
    used: 0,
    limit: 10,
    remaining: 10,
  });

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);

  const [profile, setProfile] = useState<ProfileData>({
    age: "",
    gender: "",
    weight: "",
    height: "",
    goal: "",
    limitations: "",
  });

  const [savedProfile, setSavedProfile] = useState<ProfileData>({
    age: "",
    gender: "",
    weight: "",
    height: "",
    goal: "",
    limitations: "",
  });

  function handleMessageChange(value: string) {
    setMessage(value);

    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const maxHeight = 224;
      textarea.style.height = "auto";
      const scrollHeight = textarea.scrollHeight;
      const nextHeight = Math.min(scrollHeight, maxHeight);
      textarea.style.height = `${nextHeight}px`;
      textarea.style.overflowY = scrollHeight > maxHeight ? "auto" : "hidden";

      const isSmallScreen = window.innerWidth < 640;
      setIsComposerExpanded(
        isSmallScreen || value.length > 55 || value.includes("\n"),
      );
    });
  }

  async function loadConversations(token: string, activeId?: string) {
    const res = await fetch("http://localhost:3001/chat/conversations", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setConversations(data);
      if (activeId) {
        setActiveConversationId(activeId);
      }
    }
  }

  async function handleSelectConversation(conversationId: string) {
    setActiveConversationId(conversationId);
    setChatMessages([]);

    const token = await auth.currentUser?.getIdToken();
    if (!token) return;

    const res = await fetch(
      `http://localhost:3001/chat/conversations/${conversationId}/messages`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (res.ok) {
      const messages = await res.json();
      setChatMessages(
        messages.map((m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      );
    }
  }

  function handleNewChat() {
    setActiveConversationId(null);
    setChatMessages([]);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "/";
        return;
      }

      setUserId(user.uid);
      setUserEmail(user.email ?? "");

      const token = await user.getIdToken();

      const usageResponse = await fetch("http://localhost:3001/chat/usage", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (usageResponse.ok) {
        const usageData = await usageResponse.json();
        setDailyUsage(usageData);
      }

      await loadConversations(token);

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();

        const loadedProfile: ProfileData = {
          age: data.age ?? "",
          gender: data.gender ?? "",
          weight: data.weight ?? "",
          height: data.height ?? "",
          goal: data.goal ?? "",
          limitations: data.limitations ?? "",
        };

        setProfile(loadedProfile);
        setSavedProfile(loadedProfile);
        setShowWelcomeModal(!data.profileCompleted);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1023px)");

    function handleResize() {
      setSidebarOpen(!mediaQuery.matches);
    }

    handleResize();
    mediaQuery.addEventListener("change", handleResize);
    return () => mediaQuery.removeEventListener("change", handleResize);
  }, []);

  async function handleSaveProfile() {
    if (!userId) return;

    await setDoc(
      doc(db, "users", userId),
      {
        ...profile,
        profileCompleted: true,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    setSavedProfile(profile);
    setShowWelcomeModal(false);
    setShowProfileModal(false);
  }

  function handleCloseProfileModal() {
    setProfile(savedProfile);
    setShowProfileModal(false);
  }

  async function handleLogout() {
    await signOut(auth);
    window.location.href = "/";
  }

  async function handleSubmitMessage(e: React.FormEvent) {
    e.preventDefault();

    const trimmedMessage = message.trim();
    if (!trimmedMessage || isSendingMessage) return;

    setChatMessages((current) => [
      ...current,
      { role: "user", content: trimmedMessage },
    ]);

    setMessage("");
    setIsComposerExpanded(false);

    if (textareaRef.current) {
      textareaRef.current.style.height = "24px";
      textareaRef.current.style.overflowY = "hidden";
    }

    try {
      setIsSendingMessage(true);

      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Usuário não autenticado.");

      const response = await fetch("http://localhost:3001/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: trimmedMessage,
          conversationId: activeConversationId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setChatMessages((current) => [
          ...current,
          {
            role: "assistant",
            content: data.message ?? "Erro ao consultar a IA.",
          },
        ]);
        return;
      }

      if (data.conversationId) {
        setActiveConversationId(data.conversationId);
      }

      const newConvId = data.conversationId;

      if (data.usage) setDailyUsage(data.usage);

      setChatMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            data.answer ??
            "Não foi possível obter uma resposta da IA no momento.",
        },
      ]);

      await loadConversations(token, newConvId);
    } catch {
      setChatMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            "Não foi possível conectar com a IA no momento. Tente novamente em instantes.",
        },
      ]);
    } finally {
      setIsSendingMessage(false);
    }
  }

  function normalizeMarkdown(text?: string) {
    return (text ?? "")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/^(\d+)\.\s*\n\s*/gm, "$1. ")
      .replace(/\n\s*\n(?=\s*[-*•])/g, "\n")
      .trim();
  }

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-zinc-950 text-white">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
        />
      )}

      {sidebarOpen && (
        <aside className="fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col border-r border-white/10 bg-zinc-900/95 backdrop-blur-sm lg:relative lg:z-auto lg:bg-zinc-900/70">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <Dumbbell className="h-4 w-4" />
              </span>
              <span className="tracking-tight">
                GymProgress <span className="text-emerald-400">IA</span>
              </span>
            </Link>

            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              aria-label="Fechar painel"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-zinc-400 transition hover:bg-white/10 hover:text-white"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>

          <div className="p-3">
            <button
              type="button"
              onClick={handleNewChat}
              className="flex w-full cursor-pointer items-center justify-start gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
            >
              <Plus className="h-4 w-4" />
              Novo chat
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-2 text-sm text-zinc-400">
            <p className="px-2 py-1 text-xs uppercase tracking-wide text-zinc-500">
              Recentes
            </p>

            {conversations.length === 0 ? (
              <p className="px-2 py-2 text-xs text-zinc-600">
                Nenhuma conversa ainda.
              </p>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => handleSelectConversation(conv.id)}
                  className={`mt-1 w-full truncate rounded-lg px-3 py-2 text-left text-sm transition hover:bg-white/10 ${
                    activeConversationId === conv.id
                      ? "bg-white/10 text-white"
                      : "text-zinc-400"
                  }`}
                >
                  {conv.title}
                </button>
              ))
            )}
          </div>

          <div className="border-t border-white/10 p-3">
            <div className="flex items-center gap-3 rounded-xl px-2 py-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                <User className="h-4 w-4" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{userEmail}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Mensagens hoje: {dailyUsage.used}/{dailyUsage.limit}
                </p>
              </div>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowProfileModal(true)}
                className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-sm transition hover:bg-white/10"
              >
                <User className="h-3.5 w-3.5" />
                Perfil
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-sm transition hover:bg-white/10"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sair
              </button>
            </div>

            <button className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-400 transition hover:bg-emerald-500/20">
              <ClipboardList className="h-4 w-4" />
              Ficha de Treino
            </button>
          </div>
        </aside>
      )}

      <main className="relative flex flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center border-b border-white/10 px-4 lg:hidden">
          {!sidebarOpen && (
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir painel"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-zinc-400 transition hover:bg-white/10 hover:text-white"
            >
              <PanelLeftOpen className="h-5 w-5" />
            </button>
          )}
          <span className="ml-3 text-sm font-semibold text-zinc-300">
            GymProgress <span className="text-emerald-400">IA</span>
          </span>
        </div>

        {!sidebarOpen && (
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir painel"
            className="absolute left-4 top-4 z-10 hidden h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-zinc-400 transition hover:bg-white/10 hover:text-white lg:flex"
          >
            <PanelLeftOpen className="h-5 w-5" />
          </button>
        )}

        <div className="custom-scrollbar flex flex-1 flex-col overflow-y-auto bg-zinc-950 px-6 pb-8 pt-8">
          {chatMessages.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="hidden lg:block">
                <div className="mx-auto w-full max-w-3xl text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
                    <Sparkles className="h-7 w-7" />
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                    Seu Personal Trainer{" "}
                    <span className="text-emerald-400">Inteligente</span>
                  </h1>
                  <p className="mx-auto mt-3 max-w-2xl text-zinc-400">
                    Treine com ajuda da Inteligência Artificial. Obtenha
                    sugestões de treino, dicas de exercícios e orientações para
                    alcançar seus objetivos.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-7">
              {chatMessages.map((chatMessage, index) => (
                <div
                  key={index}
                  className={`flex ${
                    chatMessage.role === "user"
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  {chatMessage.role === "user" ? (
                    <div className="max-w-[80%] rounded-2xl bg-emerald-500 px-4 py-3 text-sm leading-6 text-white">
                      {chatMessage.content}
                    </div>
                  ) : (
                    <div className="w-full max-w-none text-sm leading-6 text-zinc-200">
                      <ReactMarkdown
                        components={{
                          h1: ({ children }) => (
                            <h1 className="mb-3 text-xl font-bold">
                              {children}
                            </h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="mb-3 text-lg font-bold">
                              {children}
                            </h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="mb-2 text-base font-bold">
                              {children}
                            </h3>
                          ),
                          p: ({ children }) => (
                            <p className="mb-3 leading-6 last:mb-0">
                              {children}
                            </p>
                          ),
                          ul: ({ children }) => (
                            <ul className="mb-3 list-disc space-y-1.5 pl-5">
                              {children}
                            </ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="mb-3 list-decimal space-y-1.5 pl-5">
                              {children}
                            </ol>
                          ),
                          li: ({ children }) => (
                            <li className="leading-6 [&>p]:mb-0">{children}</li>
                          ),
                          strong: ({ children }) => (
                            <strong className="font-semibold text-white">
                              {children}
                            </strong>
                          ),
                          hr: () => (
                            <div className="my-2 border-t border-white/10" />
                          ),
                        }}
                      >
                        {normalizeMarkdown(chatMessage.content)}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              ))}

              {isSendingMessage && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-zinc-900 px-4 py-3 text-sm text-zinc-400">
                    Pensando...
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-white/10 bg-zinc-950 px-4 py-4 sm:px-6">
          <form onSubmit={handleSubmitMessage} className="mx-auto max-w-3xl">
            <div
              className={`rounded-3xl border border-white/10 bg-zinc-900 px-4 shadow-2xl focus-within:border-emerald-500/50 ${
                isComposerExpanded ? "py-3" : "py-2"
              }`}
            >
              <div
                className={
                  isComposerExpanded
                    ? "flex flex-col gap-2"
                    : "flex items-center gap-3"
                }
              >
                <textarea
                  ref={textareaRef}
                  id="prompt"
                  value={message}
                  rows={1}
                  onChange={(e) => handleMessageChange(e.target.value)}
                  placeholder="Ex.: monte um treino de pernas para hipertrofia"
                  className={
                    isComposerExpanded
                      ? "custom-scrollbar max-h-56 min-h-[24px] w-full resize-none bg-transparent text-sm leading-6 text-white outline-none placeholder:text-zinc-600"
                      : "custom-scrollbar h-6 min-h-[24px] flex-1 resize-none overflow-hidden bg-transparent text-sm leading-6 text-white outline-none placeholder:text-zinc-600"
                  }
                />

                <div
                  className={
                    isComposerExpanded
                      ? "flex justify-end"
                      : "flex shrink-0 items-center"
                  }
                >
                  <button
                    type="submit"
                    aria-label="Enviar"
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-emerald-500 text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </main>

      <ProfileModal
        isOpen={showProfileModal}
        mode="profile"
        profile={profile}
        setProfile={setProfile}
        onSave={handleSaveProfile}
        onClose={handleCloseProfileModal}
      />
      <ProfileModal
        isOpen={showWelcomeModal}
        mode="welcome"
        profile={profile}
        setProfile={setProfile}
        onSave={handleSaveProfile}
        onClose={() => setShowWelcomeModal(false)}
      />
    </div>
  );
}
