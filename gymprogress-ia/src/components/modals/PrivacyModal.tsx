"use client";

import { useState } from "react";

type PrivacyModalProps = {
  isOpen: boolean;
  onAccept: () => Promise<void>;
};

export function PrivacyModal({ isOpen, onAccept }: PrivacyModalProps) {
  const [accepted, setAccepted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  async function handleAccept() {
    if (!accepted || isSaving) return;

    setIsSaving(true);
    await onAccept();
    setIsSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-6 backdrop-blur-sm sm:items-center">
      <div className="my-auto w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-2xl sm:p-6">
        <h2 className="text-lg font-bold text-white sm:text-xl">
          Política de Privacidade e Uso de Dados
        </h2>

        <div className="mt-4 space-y-3 text-sm leading-6 text-zinc-400">
          <p>
            O GymProgress IA utiliza os dados informados pelo usuário para
            autenticação, armazenamento do perfil e personalização das respostas
            fornecidas pela Inteligência Artificial.
          </p>

          <p>
            Dados como data de nascimento, gênero, peso, altura, IMC, objetivo
            físico, nível de experiência, limitações e histórico de conversas
            podem ser utilizados pela plataforma.
          </p>

          <p>
            Parte dessas informações poderá ser enviada à Gemini API, serviço
            externo utilizado para gerar as respostas solicitadas pelo usuário.
          </p>

          <p>
            A plataforma não realiza diagnósticos, não prescreve tratamentos e
            não substitui médicos, fisioterapeutas ou profissionais de Educação
            Física.
          </p>
        </div>

        <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-emerald-500"
          />

          <span>
            Li e concordo com a Política de Privacidade e com o uso dos meus
            dados para as finalidades informadas.
          </span>
        </label>

        <button
          type="button"
          onClick={handleAccept}
          disabled={!accepted || isSaving}
          className="mt-6 w-full rounded-full bg-emerald-500 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "Salvando..." : "Confirmar"}
        </button>
      </div>
    </div>
  );
}
