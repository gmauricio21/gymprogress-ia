"use client";

import { Dumbbell, X } from "lucide-react";
import { useState } from "react";

export type ProfileData = {
  age: string;
  gender: string;
  weight: string;
  height: string;
  goal: string;
  limitations: string;
};

type ProfileModalProps = {
  isOpen: boolean;
  mode: "welcome" | "profile";
  profile: ProfileData;
  setProfile: React.Dispatch<React.SetStateAction<ProfileData>>;
  onClose: () => void;
  onSave: () => Promise<void>;
};

export function ProfileModal({
  isOpen,
  mode,
  profile,
  setProfile,
  onClose,
  onSave,
}: ProfileModalProps) {
  const [errors, setErrors] = useState<string[]>([]);

  if (!isOpen) return null;

  const isWelcome = mode === "welcome";

  function clearFieldError(field: string) {
    setErrors((currentErrors) =>
      currentErrors.filter((error) => error !== field),
    );
  }

  function inputBorder(field: string) {
    return errors.includes(field) ? "border-red-500" : "border-white/10";
  }

  async function handleSave() {
    const newErrors: string[] = [];

    if (!profile.age.trim()) newErrors.push("age");
    if (!profile.gender.trim()) newErrors.push("gender");
    if (!profile.weight.trim()) newErrors.push("weight");
    if (!profile.height.trim()) newErrors.push("height");
    if (!profile.goal.trim()) newErrors.push("goal");
    if (!profile.limitations.trim()) newErrors.push("limitations");

    setErrors(newErrors);

    if (newErrors.length > 0) return;

    await onSave();
  }

  function updateField(field: keyof ProfileData, value: string) {
    setProfile((current) => ({
      ...current,
      [field]: value,
    }));

    clearFieldError(field);
  }

  return (
    <div
      onClick={() => {
        if (!isWelcome) onClose();
      }}
      className="fixed inset-0 z-50 flex overflow-y-auto bg-black/60 px-4 py-5 backdrop-blur-sm sm:px-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative m-auto w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-2xl sm:p-6"
      >
        {!isWelcome && (
          <button
            type="button"
            aria-label="Fechar modal"
            title="Fechar"
            onClick={onClose}
            className="absolute right-4 top-4 cursor-pointer text-emerald-400 transition hover:text-emerald-300"
          >
            <X size={20} />
          </button>
        )}

        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
            <Dumbbell size={22} />
          </div>

          <div>
            <h2 className="text-xl font-bold">
              {isWelcome ? "Bem-vindo ao GymProgress IA" : "Meu Perfil"}
            </h2>

            <p className="mt-1 text-xs text-zinc-400">
              {isWelcome
                ? "Complete seu perfil para receber recomendações mais personalizadas."
                : "Personalize suas informações para treinos mais precisos."}
            </p>
          </div>
        </div>

        <form className="space-y-3">
          <section className="rounded-xl border border-white/10 bg-zinc-900/70 p-4">
            <h3 className="mb-3 text-sm font-semibold text-white">
              Informações Básicas
            </h3>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="age"
                  className="mb-1.5 block text-xs font-medium text-zinc-300"
                >
                  Idade
                </label>

                <input
                  id="age"
                  name="age"
                  type="number"
                  placeholder="Ex.: 25"
                  value={profile.age}
                  onChange={(e) => updateField("age", e.target.value)}
                  className={`h-10 w-full rounded-lg border bg-zinc-950 px-3 text-xs outline-none placeholder:text-zinc-600 focus:border-emerald-500/50 ${inputBorder(
                    "age",
                  )}`}
                />
              </div>

              <div>
                <label
                  htmlFor="gender"
                  className="mb-1.5 block text-xs font-medium text-zinc-300"
                >
                  Gênero
                </label>

                <select
                  id="gender"
                  name="gender"
                  value={profile.gender}
                  onChange={(e) => updateField("gender", e.target.value)}
                  className={`h-10 w-full rounded-lg border bg-zinc-950 px-3 text-xs outline-none focus:border-emerald-500/50 ${inputBorder(
                    "gender",
                  )}`}
                >
                  <option value="">Selecione</option>
                  <option value="masculino">Masculino</option>
                  <option value="feminino">Feminino</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="weight"
                  className="mb-1.5 block text-xs font-medium text-zinc-300"
                >
                  Peso (kg)
                </label>

                <input
                  id="weight"
                  name="weight"
                  type="number"
                  placeholder="Ex.: 75"
                  value={profile.weight}
                  onChange={(e) => updateField("weight", e.target.value)}
                  className={`h-10 w-full rounded-lg border bg-zinc-950 px-3 text-xs outline-none placeholder:text-zinc-600 focus:border-emerald-500/50 ${inputBorder(
                    "weight",
                  )}`}
                />
              </div>

              <div>
                <label
                  htmlFor="height"
                  className="mb-1.5 block text-xs font-medium text-zinc-300"
                >
                  Altura (cm)
                </label>

                <input
                  id="height"
                  name="height"
                  type="number"
                  placeholder="Ex.: 175"
                  value={profile.height}
                  onChange={(e) => updateField("height", e.target.value)}
                  className={`h-10 w-full rounded-lg border bg-zinc-950 px-3 text-xs outline-none placeholder:text-zinc-600 focus:border-emerald-500/50 ${inputBorder(
                    "height",
                  )}`}
                />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-white/10 bg-zinc-900/70 p-4">
            <h3 className="mb-3 text-sm font-semibold text-white">Objetivo</h3>

            <label
              htmlFor="goal"
              className="mb-1.5 block text-xs font-medium text-zinc-300"
            >
              Meta de Treino
            </label>

            <textarea
              id="goal"
              name="goal"
              placeholder="Ex.: ganhar massa muscular, perder gordura..."
              value={profile.goal}
              onChange={(e) => updateField("goal", e.target.value)}
              className={`min-h-16 w-full resize-none rounded-lg border bg-zinc-950 px-3 py-2 text-xs outline-none placeholder:text-zinc-600 focus:border-emerald-500/50 ${inputBorder(
                "goal",
              )}`}
            />

            <p className="text-[12px] text-zinc-500">
              Essa informação ajuda a IA a criar treinos personalizados.
            </p>
          </section>

          <section className="rounded-xl border border-white/10 bg-zinc-900/70 p-4">
            <h3 className="mb-3 text-sm font-semibold text-white">
              Restrições e Limitações
            </h3>

            <label
              htmlFor="limitations"
              className="mb-1.5 block text-xs font-medium text-zinc-300"
            >
              Problemas de Saúde ou Lesões
            </label>

            <textarea
              id="limitations"
              name="limitations"
              placeholder="Ex.: dor no joelho, lesão no ombro..."
              value={profile.limitations}
              onChange={(e) => updateField("limitations", e.target.value)}
              className={`min-h-16 w-full resize-none rounded-lg border bg-zinc-950 px-3 py-2 text-xs outline-none placeholder:text-zinc-600 focus:border-emerald-500/50 ${inputBorder(
                "limitations",
              )}`}
            />

            <p className="text-[12px] text-zinc-500">
              Essas informações garantem treinos seguros e adequados.
            </p>
          </section>

          <div className="flex flex-col gap-2 pt-1 sm:flex-row">
            <button
              type="button"
              onClick={handleSave}
              className="w-full cursor-pointer rounded-full bg-emerald-500 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600"
            >
              Salvar Perfil
            </button>

            {!isWelcome && (
              <button
                type="button"
                onClick={onClose}
                className="w-full cursor-pointer rounded-full border border-white/10 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-white/10"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}