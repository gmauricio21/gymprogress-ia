/**
 * Normaliza o conteúdo Markdown antes da renderização.
 * - Remove quebras de linha excessivas;
 * - Corrige itens numerados quebrados em várias linhas;
 * - Ajusta espaçamentos em listas;
 * - Remove espaços em branco no início e fim do texto.
 */
export function normalizeMarkdown(text?: string) {
  return (text ?? "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^(\d+)\.\s*\n\s*/gm, "$1. ")
    .replace(/\n\s*\n(?=\s*[-*•])/g, "\n")
    .trim();
}