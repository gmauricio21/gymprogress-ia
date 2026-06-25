import { useCallback, useState } from "react";
import { auth } from "@/lib/firebase";
import { ChatMessage } from "@/hooks/useDashboardConversations";

type DailyUsage = {
  used: number;
  limit: number;
  remaining: number;
};

type UseDashboardChatParams = {
  message: string;
  activeConversationId: string | null;
  setActiveConversationId: React.Dispatch<React.SetStateAction<string | null>>;
  resetComposer: () => void;
  loadConversations: (token: string, activeId?: string) => Promise<void>;
  setDailyUsage: React.Dispatch<React.SetStateAction<DailyUsage>>;
};

/**
 * Controla o envio de mensagens para a IA no dashboard.
 *
 * Responsável por:
 * - armazenar as mensagens do chat;
 * - enviar a pergunta do usuário para o backend;
 * - receber a resposta da IA por stream;
 * - atualizar a conversa ativa;
 * - atualizar o uso diário de mensagens.
 */
export function useDashboardChat({
  message,
  activeConversationId,
  setActiveConversationId,
  resetComposer,
  loadConversations,
  setDailyUsage,
}: UseDashboardChatParams) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  /**
   * Envia a mensagem digitada pelo usuário para a IA.
   *
   * A resposta é recebida em partes pelo stream e adicionada
   * progressivamente na última mensagem do assistente.
   */
  const handleSubmitMessage = useCallback(
    async function handleSubmitMessage(e: React.FormEvent) {
      e.preventDefault();

      const trimmedMessage = message.trim();
      if (!trimmedMessage || isSendingMessage) return;

      if (trimmedMessage.length > 2000) {
        setChatMessages((current) => [
          ...current,
          {
            role: "assistant",
            content: "A mensagem deve ter no máximo 2.000 caracteres.",
            isComplete: true,
          },
        ]);
        return;
      }

      setChatMessages((current) => [
        ...current,
        { role: "user", content: trimmedMessage },
      ]);

      resetComposer();

      try {
        setIsSendingMessage(true);

        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error("Usuário não autenticado.");

        // Adiciona uma resposta vazia da IA que será preenchida pelo stream.
        setChatMessages((current) => [
          ...current,
          { role: "assistant", content: "", isComplete: false },
        ]);

        const response = await fetch("http://localhost:3001/chat/stream", {
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

        if (!response.ok || !response.body) {
          const data = await response.json();

          setChatMessages((current) => {
            const updated = [...current];
            updated[updated.length - 1] = {
              role: "assistant",
              content: data.message ?? "Erro ao consultar a IA.",
            };
            return updated;
          });

          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;

            const json = line.replace("data: ", "").trim();
            if (!json) continue;

            try {
              const parsed = JSON.parse(json);

              if (parsed.error) {
                setChatMessages((current) => {
                  const updated = [...current];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: parsed.error,
                  };
                  return updated;
                });

                return;
              }

              if (parsed.chunk) {
                setChatMessages((current) => {
                  const updated = [...current];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: updated[updated.length - 1].content + parsed.chunk,
                    isComplete: false,
                  };
                  return updated;
                });
              }

              if (parsed.done) {
                setChatMessages((current) => {
                  const updated = [...current];

                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    isComplete: true,
                  };

                  return updated;
                });
                if (parsed.conversationId) {
                  setActiveConversationId(parsed.conversationId);
                }

                if (parsed.usage) {
                  setDailyUsage(parsed.usage);
                }

                await loadConversations(token, parsed.conversationId);
              }
            } catch {
              // Ignora linhas malformadas recebidas no stream.
            }
          }
        }
      } catch {
        setChatMessages((current) => {
          const updated = [...current];
          updated[updated.length - 1] = {
            role: "assistant",
            content:
              "Não foi possível conectar com a IA no momento. Tente novamente em instantes.",
          };
          return updated;
        });
      } finally {
        setIsSendingMessage(false);
      }
    },
    [
      message,
      isSendingMessage,
      activeConversationId,
      resetComposer,
      setActiveConversationId,
      setDailyUsage,
      loadConversations,
    ],
  );

  return {
    chatMessages,
    setChatMessages,
    isSendingMessage,
    handleSubmitMessage,
  };
}
