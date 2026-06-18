import { useRef, useState } from "react";

/**
 * Controla o campo de mensagem do chat.
 *
 * Responsável por:
 * - armazenar o texto digitado;
 * - controlar se o campo está expandido;
 * - ajustar automaticamente a altura do textarea;
 * - limitar a altura máxima do campo.
 */
export function useChatComposer() {
  const [message, setMessage] = useState("");
  const [isComposerExpanded, setIsComposerExpanded] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  /**
   * Atualiza a mensagem digitada e ajusta o tamanho do textarea
   * conforme o conteúdo inserido pelo usuário.
   */
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

  /**
   * Limpa o campo de mensagem e retorna o textarea
   * para o tamanho inicial.
   */
  function resetComposer() {
    setMessage("");
    setIsComposerExpanded(false);

    if (textareaRef.current) {
      textareaRef.current.style.height = "24px";
      textareaRef.current.style.overflowY = "hidden";
    }
  }

  return {
    message,
    setMessage,
    textareaRef,
    isComposerExpanded,
    setIsComposerExpanded,
    handleMessageChange,
    resetComposer,
  };
}
