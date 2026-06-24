"use client";

import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  Dumbbell,
  Lock,
  Mail,
  X,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";
import { useState } from "react";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";

type LoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onForgotPassword: () => void;
  onRegister: () => void;
};

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.207 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.27 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.27 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.147 35.091 26.671 36 24 36c-5.186 0-9.625-3.331-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.228 4.166-4.084 5.57l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

export function LoginModal({ isOpen, onClose, onRegister }: LoginModalProps) {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  function resetForm() {
    setEmail("");
    setPassword("");
    setError("");
    setLoading(false);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Informe seu e-mail.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Informe um e-mail válido.");
      return;
    }
    if (!password.trim()) {
      setError("Informe sua senha.");
      return;
    }

    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      setTimeout(() => router.push("/dashboard"), 1000);
    } catch {
      setLoading(false);
      setError("E-mail ou senha inválidos.");
    }
  }

  async function handleGoogleLogin() {
    setError("");
    try {
      setLoading(true);
      const credential = await signInWithPopup(auth, googleProvider);
      const user = credential.user;

      const { doc, getDoc, setDoc, serverTimestamp } =
        await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          name: user.displayName ?? "",
          email: user.email ?? "",
          photoURL: user.photoURL ?? null,
          provider: "google",
          profileCompleted: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      setTimeout(() => router.push("/dashboard"), 1000);
    } catch {
      setLoading(false);
      setError("Não foi possível entrar com Google.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-md"
      onClick={handleClose}
    >
      <div className="flex min-h-dvh items-center justify-center p-4 sm:p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-[420px]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0b1117] shadow-2xl shadow-black/60">
            {/* Top highlight */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
            {/* Inner glow */}
            <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-64 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />

            {/* Loading overlay */}
            {loading && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-3xl bg-[#0b1117]/90 backdrop-blur-sm">
                <div className="relative flex h-12 w-12 items-center justify-center">
                  <div className="absolute h-12 w-12 animate-spin rounded-full border-2 border-emerald-500/20 border-t-emerald-400" />
                  <Dumbbell className="h-5 w-5 text-emerald-400/60" />
                </div>
                <p className="mt-4 text-sm font-medium text-zinc-400">
                  Entrando...
                </p>
              </div>
            )}

            <div className="relative px-8 pb-8 pt-7">
              {/* Close */}
              <button
                type="button"
                onClick={handleClose}
                aria-label="Fechar"
                className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-white/5 hover:text-zinc-300"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Header */}
              <div className="mb-7">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
                  <Dumbbell className="h-5 w-5 text-emerald-400" />
                </div>
                <h2 className="font-barlow text-[1.6rem] font-black leading-tight text-white">
                  Bem-vindo de volta
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Entre para continuar evoluindo seus treinos.
                </p>
              </div>

              {/* Google */}
              <button
                type="button"
                disabled={loading}
                onClick={handleGoogleLogin}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] py-3 text-sm font-semibold text-zinc-200 transition hover:border-white/20 hover:bg-white/[0.07] disabled:pointer-events-none disabled:opacity-50"
              >
                <GoogleIcon className="h-5 w-5" />
                Continuar com Google
              </button>

              {/* Divider */}
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/[0.07]" />
                <span className="text-xs font-medium text-zinc-600">ou</span>
                <div className="h-px flex-1 bg-white/[0.07]" />
              </div>

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    E-mail
                  </label>
                  <div className="group flex items-center gap-2.5 rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 ring-emerald-500/30 transition focus-within:border-emerald-500/30 focus-within:ring-1">
                    <Mail className="h-4 w-4 shrink-0 text-zinc-600 transition group-focus-within:text-emerald-400" />
                    <input
                      type="text"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Senha
                    </label>
                  </div>
                  <div className="group flex items-center gap-2.5 rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 ring-emerald-500/30 transition focus-within:border-emerald-500/30 focus-within:ring-1">
                    <Lock className="h-4 w-4 shrink-0 text-zinc-600 transition group-focus-within:text-emerald-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      className="password-input w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="shrink-0 text-zinc-600 transition hover:text-zinc-300"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-2.5 rounded-2xl border border-red-500/20 bg-red-500/[0.08] px-4 py-3">
                    <AlertCircle className="mt-px h-4 w-4 shrink-0 text-red-400" />
                    <p className="text-sm leading-snug text-red-300">{error}</p>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-emerald-500 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
                >
                  Entrar
                </button>
              </form>

              {/* Footer */}
              <p className="mt-5 text-center text-xs text-zinc-600">
                Ainda não tem conta?{" "}
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    onRegister();
                  }}
                  className="font-semibold text-emerald-400 hover:text-emerald-300 transition hover:underline"
                >
                  Criar conta grátis
                </button>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
