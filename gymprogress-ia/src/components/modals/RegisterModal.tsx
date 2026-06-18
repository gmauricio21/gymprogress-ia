"use client";

import { auth, db, googleProvider } from "@/lib/firebase";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { Dumbbell, Eye, EyeOff, Lock, Mail, User, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type RegisterModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onBackToLogin: () => void;
};

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

  if (!isOpen) {
    return null;
  }

  /**
   * Limpa todos os campos, mensagens e estados temporários do formulário.
   *
   * Também oculta novamente os campos de senha e remove o estado de carregamento.
   */
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

  /**
   * Fecha o modal após limpar os dados preenchidos no formulário.
   */
  function handleClose() {
    resetForm();
    onClose();
  }

  /**
   * Valida os dados informados e cria uma nova conta com e-mail e senha.
   *
   * Após criar o usuário no Firebase Authentication, atualiza o nome do perfil
   * e salva os dados iniciais do usuário no Firestore.
   */
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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
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

      await updateProfile(credential.user, {
        displayName: name,
      });

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

      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
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

  /**
   * Realiza o cadastro/login com uma conta Google.
   *
   * Os dados básicos do usuário são salvos no Firestore
   * e, caso o documento já exista, as informações são mescladas.
   */
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
      onClick={handleClose}
      className="fixed inset-0 z-50 flex overflow-y-auto bg-black/60 px-4 py-6 backdrop-blur-sm sm:px-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative m-auto w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950 p-6 shadow-2xl sm:p-8"
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

        {loading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-3xl bg-zinc-950/90 backdrop-blur-md">
            <div className="h-11 w-11 animate-spin rounded-full border-4 border-emerald-500/20 border-t-emerald-400" />
            <p className="mt-4 text-center text-sm font-medium text-zinc-300">
              {success || "Criando conta..."}
            </p>
          </div>
        )}

        <div className="mb-5 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
            <Dumbbell size={28} />
          </div>

          <h2 className="text-2xl font-bold">Criar sua conta</h2>

          <p className="mt-2 text-sm text-zinc-400">
            Comece grátis e acompanhe sua evolução com IA.
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-3 sm:space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Nome
            </label>

            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3">
              <User size={18} className="text-zinc-500" />
              <input
                type="text"
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-600"
              />
            </div>
          </div>

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

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Senha
            </label>

            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3">
              <Lock size={18} className="text-zinc-500" />

              <input
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Digite sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="password-input w-full bg-transparent text-sm outline-none placeholder:text-zinc-600"
              />

              <button
                type="button"
                // Alterna a visualização da senha principal.
                onClick={() => setShowPassword(!showPassword)}
                className="cursor-pointer text-zinc-500 transition hover:text-zinc-300"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Confirmar senha
            </label>

            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3">
              <Lock size={18} className="text-zinc-500" />

              <input
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Confirme sua senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="password-input w-full bg-transparent text-sm outline-none placeholder:text-zinc-600"
              />

              <button
                type="button"
                // Alterna a visualização da confirmação de senha.
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="cursor-pointer text-zinc-500 transition hover:text-zinc-300"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          {error && (
            <div className="rounded-full border border-red-500/20 bg-red-500/10 px-4 py-3 text-center text-sm font-medium text-red-400">
              {error}
            </div>
          )}
          <button
            disabled={loading}
            className="w-full cursor-pointer rounded-full bg-emerald-500 py-3 font-semibold text-white transition hover:bg-emerald-600"
          >
            Criar conta
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleLogin}
            className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-full border border-white/10 bg-white py-3 font-semibold text-zinc-950 transition hover:bg-zinc-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 48 48"
              className="h-5 w-5"
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
            Entrar com Google
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-400">
          Já tem uma conta?{" "}
          <button
            type="button"
            onClick={() => {
              resetForm();
              onBackToLogin();
            }}
            className="cursor-pointer font-semibold text-emerald-400 hover:text-emerald-300 hover:underline"
          >
            Entrar
          </button>
        </p>
      </div>
    </div>
  );
}
