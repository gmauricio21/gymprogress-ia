import { useEffect, useState } from "react";

/**
 * Controla a abertura da sidebar de acordo com o tamanho da tela.
 *
 * Em telas grandes, a sidebar inicia aberta.
 * Em telas menores, a sidebar inicia fechada para não ocupar a tela.
 */
export function useResponsiveSidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1023px)");

    function handleResize() {
      setSidebarOpen(!mediaQuery.matches);
    }

    handleResize();

    mediaQuery.addEventListener("change", handleResize);

    return () => {
      mediaQuery.removeEventListener("change", handleResize);
    };
  }, []);

  return {
    sidebarOpen,
    setSidebarOpen,
  };
}