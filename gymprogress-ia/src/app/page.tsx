"use client";
import Link from "next/link";
import { motion } from "motion/react";
import { useState } from "react";
import { ArrowRight, Dumbbell, Sparkles } from "lucide-react";
import { LoginModal } from "@/components/modals/LoginModal";
import { RegisterModal } from "@/components/modals/RegisterModal";
import Image from "next/image";

export default function Home() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#060a0e] text-white lg:h-screen lg:overflow-hidden">
      <header className="absolute inset-x-0 top-0 z-10">
        <nav className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Dumbbell className="h-5 w-5" />
            </span>
            <Image
              src="/LogoGymProgressIA.png"
              alt="GymProgress IA"
              width={160}
              height={40}
              unoptimized
              loading="eager"
              className="h-9 w-auto object-contain"
            />
          </Link>
          <button
            onClick={() => setIsLoginOpen(true)}
            className="cursor-pointer rounded-2xl border border-emerald-500/30 px-5 py-2 text-sm font-semibold text-emerald-400 transition hover:bg-emerald-500/10"
          >
            Entrar
          </button>
        </nav>
      </header>

      <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 pt-24 pb-20">
        {/* Background */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute right-[15%] top-[30%] h-[36rem] w-[36rem] -translate-y-1/2 rounded-full bg-emerald-500/[0.07] blur-[120px]" />
          <div className="absolute left-[20%] bottom-[20%] h-[22rem] w-[22rem] rounded-full bg-emerald-400/[0.05] blur-[90px]" />
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(52,211,153,0.8) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 70% 70% at 50% 50%, transparent 30%, #060a0e 100%)",
            }}
          />
        </div>

        <section className="relative z-10 mx-auto flex max-w-3xl flex-col items-center text-center">
          <motion.span
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mb-7 inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-emerald-400"
          >
            <Sparkles className="h-3 w-3" />
            Treinos personalizados com IA
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.07 }}
            className="font-barlow text-[clamp(2.75rem,9vw,5.5rem)] font-black leading-[1.0] tracking-tight text-white"
          >
            Evolua mais rápido,{" "}
            <br className="hidden sm:block" />
            <span className="text-emerald-400">treine melhor</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.14 }}
            className="mt-6 max-w-[480px] text-base leading-relaxed text-zinc-400 sm:text-[1.05rem]"
          >
            O GymProgress IA ajuda você a organizar seus treinos e tirar dúvidas
            com auxílio da inteligência artificial.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.22 }}
            className="mt-9 flex flex-col items-center gap-3 sm:flex-row"
          >
            <button
              type="button"
              onClick={() => setIsRegisterOpen(true)}
              className="cursor-pointer group flex items-center gap-2 rounded-full bg-emerald-500 px-8 py-3.5 text-[0.9rem] font-semibold text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-400 transition-all duration-200 active:scale-95"
            >
              Criar conta grátis
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
            <button
              type="button"
              onClick={() => setIsLoginOpen(true)}
              className="cursor-pointer flex items-center gap-1.5 px-4 py-3.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Já tenho conta
              <span className="text-emerald-500">→</span>
            </button>
          </motion.div>
        </section>
      </main>

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onForgotPassword={() => setIsLoginOpen(false)}
        onRegister={() => {
          setIsLoginOpen(false);
          setIsRegisterOpen(true);
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