import { useCallback, useState } from "react";
import { auth } from "@/lib/firebase";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type Conversation = {
  id: string;
  title: string;
  updatedAt: { seconds: number } | null;
};

/**
 * Controla as conversas do dashboard.
 *
 * Responsável por:
 * - carregar a lista de conversas;
 * - selecionar uma conversa existente;
 * - iniciar um novo chat;
 * - excluir uma conversa;
 * - controlar qual conversa está ativa.
 */
export function useDashboardConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);

  const [conversationToDelete, setConversationToDelete] =
    useState<Conversation | null>(null);

  const [isDeletingConversation, setIsDeletingConversation] = useState(false);

  /**
   * Carrega as conversas salvas do usuário.
   *
   * Caso receba um activeId, define essa conversa como ativa
   * após atualizar a lista.
   */
  const loadConversations = useCallback(async function loadConversations(
    token: string,
    activeId?: string,
  ) {
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
  }, []);

  /**
   * Seleciona uma conversa e carrega suas mensagens.
   */
  const handleSelectConversation = useCallback(
    async function handleSelectConversation(
      conversationId: string,
      setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
    ) {
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
    },
    [],
  );

  /**
   * Inicia um novo chat sem conversa ativa.
   */
  const handleNewChat = useCallback(function handleNewChat(
    setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  ) {
    setActiveConversationId(null);
    setChatMessages([]);
  }, []);

  /**
   * Exclui a conversa selecionada.
   *
   * Se a conversa excluída for a conversa ativa,
   * limpa também as mensagens exibidas na tela.
   */
  const handleDeleteConversation = useCallback(
    async function handleDeleteConversation(
      setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
    ) {
      if (!conversationToDelete) return;

      setIsDeletingConversation(true);

      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;

        const res = await fetch(
          `http://localhost:3001/chat/conversations/${conversationToDelete.id}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (res.ok) {
          if (activeConversationId === conversationToDelete.id) {
            setActiveConversationId(null);
            setChatMessages([]);
          }

          await loadConversations(token);
          setConversationToDelete(null);
        }
      } finally {
        setIsDeletingConversation(false);
      }
    },
    [conversationToDelete, activeConversationId, loadConversations],
  );

  return {
    conversations,
    activeConversationId,
    setActiveConversationId,
    conversationToDelete,
    setConversationToDelete,
    isDeletingConversation,
    loadConversations,
    handleSelectConversation,
    handleNewChat,
    handleDeleteConversation,
  };
}
