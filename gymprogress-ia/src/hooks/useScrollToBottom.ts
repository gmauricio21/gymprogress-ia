import { useEffect, useRef } from "react";

/**
 * Controla o scroll automático para o final de uma lista.
 *
 * No chat, esse hook é usado para rolar a tela até a última mensagem
 * sempre que a lista de mensagens for atualizada.
 */
export function useScrollToBottom<TDependency>(dependency: TDependency) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [dependency]);

  return endRef;
}