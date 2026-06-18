"use client";

import { Dumbbell, Mail, X } from "lucide-react";
import { useState } from "react";

type ForgotPasswordModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onBackToLogin: () => void;
};

export function ForgotPasswordModal({
  isOpen,
  onClose,
  onBackToLogin,
}: ForgotPasswordModalProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!isOpen) {
    return null;
  }

  /**
   * Valida o e-mail informado pelo usuário e exibe
   * uma mensagem simulando o envio do link de recuperação.
   */
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError("Informe seu e-mail.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      setError("Informe um e-mail válido.");
      return;
    }

    setSuccess("Link de recuperação enviado para o e-mail informado.");
  }

  /**
   * Limpa todos os campos e mensagens do formulário.
   */
  function resetForm() {
    setEmail("");
    setError("");
    setSuccess("");
  }

  /**
   * Fecha o modal e limpa o formulário antes de sair.
   */
  function handleClose() {
    resetForm();
    onClose();
  }

  return (
    <div
      onClick={handleClose}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 px-4 py-6 backdrop-blur-sm sm:px-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950 p-6 shadow-2xl sm:p-8"
      >
        <button
          type="button"
          aria-label="Fechar modal"
          title="Fechar"
          onClick={handleClose}
          className="absolute right-5 top-5 cursor-pointer text-emerald-400 transition hover:text-emerald-300"
        >
          <X size={22} />
        </button>

        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
            <Dumbbell size={28} />
          </div>

          <h2 className="text-2xl font-bold">Recuperar senha</h2>

          <p className="mt-2 text-sm text-zinc-400">
            Digite seu e-mail para receber o link de recuperação.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              E-mail
            </label>

            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3">
              <Mail size={18} className="text-zinc-500" />
              <input
                type="text"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-600"
              />
            </div>
          </div>
          {error && (
            <div className="rounded-full border border-red-500/20 bg-red-500/10 px-4 py-3 text-center text-sm font-medium text-red-400">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-center text-sm font-medium text-emerald-400">
              {success}
            </div>
          )}
          <button className="w-full cursor-pointer rounded-full bg-emerald-500 py-3 font-semibold text-white transition hover:bg-emerald-600">
            Enviar link de recuperação
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-400">
          Lembrou a senha?{" "}
          <button
            type="button"
            onClick={() => {
              resetForm();
              onBackToLogin();
            }}
            className="cursor-pointer font-semibold text-emerald-400 hover:text-emerald-300 hover:underline"
          >
            Voltar para o login
          </button>
        </p>
      </div>
    </div>
  );
}
