"use client";

import { auth, db, googleProvider } from "@/lib/firebase";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { motion } from "motion/react";
import {
  Dumbbell,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  X,
  AlertCircle,
  CheckCircle2,
  Check,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type RegisterModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onBackToLogin: () => void;
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

function passwordStrength(pw: string): {
  level: 0 | 1 | 2 | 3;
  label: string;
  color: string;
} {
  if (!pw) return { level: 0, label: "", color: "" };
  if (pw.length < 6) return { level: 1, label: "Fraca", color: "bg-red-500" };
  if (pw.length < 10)
    return { level: 2, label: "Média", color: "bg-amber-400" };
  return { level: 3, label: "Forte", color: "bg-emerald-400" };
}

export function RegisterModal({
  isOpen,
  onClose,
  onBackToLogin,
}: RegisterModalProps) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const strength = passwordStrength(password);
  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  if (!isOpen) return null;

  function resetForm() {
    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setLoading(false);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("Informe seu nome.");
      return;
    }
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
    if (password.length < 6) {
      setError("A senha deve possuir pelo menos 6 caracteres.");
      return;
    }
    if (!confirmPassword.trim()) {
      setError("Confirme sua senha.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    try {
      setLoading(true);
      const credential = await createUserWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        password,
      );

      await updateProfile(credential.user, { displayName: name });

      await setDoc(doc(db, "users", credential.user.uid), {
        uid: credential.user.uid,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        photoURL: credential.user.photoURL ?? null,
        provider: "email",
        height: null,
        weight: null,
        goal: "",
        limitations: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setSuccess("Conta criada com sucesso! Redirecionando...");
      setTimeout(() => router.push("/dashboard"), 1000);
    } catch (error: unknown) {
      setLoading(false);
      const firebaseError = error as { code?: string };
      if (firebaseError.code === "auth/email-already-in-use") {
        setError("Já existe uma conta cadastrada com este e-mail.");
        return;
      }
      if (firebaseError.code === "auth/invalid-email") {
        setError("Informe um e-mail válido.");
        return;
      }
      if (firebaseError.code === "auth/weak-password") {
        setError("A senha deve possuir pelo menos 6 caracteres.");
        return;
      }
      setError("Não foi possível criar sua conta.");
    }
  }

  async function handleGoogleLogin() {
    setError("");
    try {
      setLoading(true);
      const credential = await signInWithPopup(auth, googleProvider);
      const user = credential.user;

      await setDoc(
        doc(db, "users", user.uid),
        {
          uid: user.uid,
          name: user.displayName ?? "",
          email: user.email ?? "",
          photoURL: user.photoURL ?? null,
          provider: "google",
          height: null,
          weight: null,
          goal: "",
          limitations: "",
          profileCompleted: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      router.push("/dashboard");
    } catch {
      setLoading(false);
      setError("Erro ao entrar com Google.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-md"
      onClick={handleClose}
    >
      <div className="flex min-h-dvh items-center justify-center p-4 sm:p-8">
        <motion.div
          className="relative w-full max-w-[440px]"
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0b1117] shadow-2xl shadow-black/60">
            {/* Top highlight */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
            {/* Inner glow */}
            <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-64 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />

            {/* Loading / success overlay */}
            {loading && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-3xl bg-[#0b1117]/90 backdrop-blur-sm">
                {success ? (
                  <>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15">
                      <Check className="h-6 w-6 text-emerald-400" />
                    </div>
                    <p className="mt-4 text-sm font-medium text-zinc-300">
                      {success}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="relative flex h-12 w-12 items-center justify-center">
                      <div className="absolute h-12 w-12 animate-spin rounded-full border-2 border-emerald-500/20 border-t-emerald-400" />
                      <Dumbbell className="h-5 w-5 text-emerald-400/60" />
                    </div>
                    <p className="mt-4 text-sm font-medium text-zinc-400">
                      Criando conta...
                    </p>
                  </>
                )}
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
              <div className="mb-6">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
                  <Dumbbell className="h-5 w-5 text-emerald-400" />
                </div>
                <h2 className="font-barlow text-[1.6rem] font-black leading-tight text-white">
                  Criar sua conta
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Comece grátis e acompanhe sua evolução com IA.
                </p>
              </div>

              {/* Google */}
              <button
                type="button"
                disabled={loading}
                onClick={handleGoogleLogin}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] py-3 text-sm font-semibold text-zinc-200 transition hover:border-white/20 hover:bg-white/[0.07] disabled:pointer-events-none disabled:opacity-50"
              >
                <GoogleIcon className="h-4 w-4" />
                Continuar com Google
              </button>

              {/* Divider */}
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/[0.07]" />
                <span className="text-xs font-medium text-zinc-600">ou</span>
                <div className="h-px flex-1 bg-white/[0.07]" />
              </div>

              {/* Form */}
              <form onSubmit={handleRegister} className="space-y-4">
                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Nome
                  </label>
                  <div className="group flex items-center gap-2.5 rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 ring-emerald-500/30 transition focus-within:border-emerald-500/30 focus-within:ring-1">
                    <User className="h-4 w-4 shrink-0 text-zinc-600 transition group-focus-within:text-emerald-400" />
                    <input
                      type="text"
                      placeholder="Seu nome"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
                    />
                  </div>
                </div>

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
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Senha
                  </label>
                  <div className="group flex items-center gap-2.5 rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 ring-emerald-500/30 transition focus-within:border-emerald-500/30 focus-within:ring-1">
                    <Lock className="h-4 w-4 shrink-0 text-zinc-600 transition group-focus-within:text-emerald-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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
                  {/* Strength bar */}
                  {password.length > 0 && (
                    <div className="flex items-center gap-2 pt-0.5">
                      <div className="flex flex-1 gap-1">
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                              i <= strength.level
                                ? strength.color
                                : "bg-white/10"
                            }`}
                          />
                        ))}
                      </div>
                      <span
                        className={`text-[11px] font-medium ${
                          strength.level === 1
                            ? "text-red-400"
                            : strength.level === 2
                              ? "text-amber-400"
                              : "text-emerald-400"
                        }`}
                      >
                        {strength.label}
                      </span>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Confirmar senha
                  </label>
                  <div
                    className={`group flex items-center gap-2.5 rounded-2xl border bg-white/[0.04] px-4 py-3 ring-emerald-500/30 transition focus-within:ring-1 ${
                      passwordsMismatch
                        ? "border-red-500/30 focus-within:border-red-500/40"
                        : passwordsMatch
                          ? "border-emerald-500/30"
                          : "border-white/8 focus-within:border-emerald-500/30"
                    }`}
                  >
                    <Lock
                      className={`h-4 w-4 shrink-0 transition ${
                        passwordsMismatch
                          ? "text-red-400"
                          : passwordsMatch
                            ? "text-emerald-400"
                            : "text-zinc-600 group-focus-within:text-emerald-400"
                      }`}
                    />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Repita a senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="password-input w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
                    />
                    {passwordsMatch ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="shrink-0 text-zinc-600 transition hover:text-zinc-300"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                  {passwordsMismatch && (
                    <p className="text-[11px] text-red-400">
                      As senhas não coincidem.
                    </p>
                  )}
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
                  Criar conta grátis
                </button>
              </form>

              {/* Footer */}
              <p className="mt-5 text-center text-sm text-zinc-600">
                Já tem uma conta?{" "}
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    onBackToLogin();
                  }}
                  className="font-semibold text-emerald-400 hover:text-emerald-300 transition hover:underline"
                >
                  Entrar
                </button>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
