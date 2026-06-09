"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Dumbbell, Sparkles } from "lucide-react";
import { LoginModal } from "@/components/modals/LoginModal";
import { ForgotPasswordModal } from "@/components/modals/ForgotPasswordModal";
import { RegisterModal } from "@/components/modals/RegisterModal";

export default function Home() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-950 text-white lg:h-screen lg:overflow-hidden">
      <header className="absolute inset-x-0 top-0 z-10">
        <nav className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Dumbbell className="h-5 w-5" />
            </span>

            <span className="text-lg tracking-tight">
              GymProgress <span className="text-emerald-400">IA</span>
            </span>
          </Link>

          <button
            onClick={() => setIsLoginOpen(true)}
            className="cursor-pointer rounded-2xl border border-emerald-500/30 px-5 py-2 text-sm font-semibold text-emerald-400 transition hover:bg-emerald-500/10"
          >
            Entrar
          </button>
        </nav>
      </header>

      <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-1/2 h-[38rem] w-[38rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="absolute left-1/2 top-1/2 h-[18rem] w-[18rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400/20 blur-2xl" />
        </div>

        <section className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-medium text-emerald-400">
            <Sparkles className="h-3.5 w-3.5" />
            Treinos personalizados com IA
          </span>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Evolua mais rápido,{" "}
            <span className="text-emerald-400">treine melhor</span>
          </h1>

          <p className="mt-6 max-w-xl text-base text-zinc-400 sm:text-lg">
            O GymProgress IA ajuda você a organizar seus treinos e tirar dúvidas
            com auxílio da inteligência artificial.
          </p>

          <div className="mt-10 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsRegisterOpen(true)}
              className="group flex w-full cursor-pointer items-center justify-center rounded-full bg-emerald-500 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-600 sm:w-auto"
            >
              Criar conta grátis
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </section>
      </main>
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onForgotPassword={() => {
          setIsLoginOpen(false);
          setIsForgotPasswordOpen(true);
        }}
        onRegister={() => {
          setIsLoginOpen(false);
          setIsRegisterOpen(true);
        }}
      />

      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        onBackToLogin={() => {
          setIsForgotPasswordOpen(false);
          setIsLoginOpen(true);
        }}
      />

      <RegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onBackToLogin={() => {
          setIsRegisterOpen(false);
          setIsLoginOpen(true);
        }}
      />
    </div>
  );
}
