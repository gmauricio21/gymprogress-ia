"use client";

import React, { useState } from "react";
import {
  Dumbbell,
  X,
  Calendar,
  User,
  Scale,
  Ruler,
  TrendingDown,
  Zap,
  Target,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Save,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProfileData = {
  birthDate: string;
  gender: string;
  weight: string;
  height: string;
  bmi?: string;
  bmiClassification?: string;
  experienceLevel: string;
  goal: string;
  customGoal: string;
  hasLimitations: string;
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

// ─── BMI config ───────────────────────────────────────────────────────────────

type BmiCategory =
  | "magreza"
  | "normal"
  | "sobrepeso"
  | "obesidade_1"
  | "obesidade_2"
  | "obesidade_3";

const BMI_MAP: Record<
  BmiCategory,
  {
    label: string;
    color: string;
    border: string;
    bg: string;
    ring: string;
    bar: string;
    pct: number;
  }
> = {
  magreza: {
    label: "Magreza",
    color: "text-sky-400",
    border: "border-sky-500/30",
    bg: "bg-sky-500/8",
    ring: "ring-sky-500/20",
    bar: "bg-sky-400",
    pct: 8,
  },
  normal: {
    label: "Normal",
    color: "text-emerald-400",
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/8",
    ring: "ring-emerald-500/20",
    bar: "bg-emerald-400",
    pct: 32,
  },
  sobrepeso: {
    label: "Sobrepeso",
    color: "text-amber-400",
    border: "border-amber-500/30",
    bg: "bg-amber-500/8",
    ring: "ring-amber-500/20",
    bar: "bg-amber-400",
    pct: 56,
  },
  obesidade_1: {
    label: "Obesidade Grau I",
    color: "text-orange-400",
    border: "border-orange-500/30",
    bg: "bg-orange-500/8",
    ring: "ring-orange-500/20",
    bar: "bg-orange-400",
    pct: 72,
  },
  obesidade_2: {
    label: "Obesidade Grau II",
    color: "text-red-400",
    border: "border-red-500/30",
    bg: "bg-red-500/8",
    ring: "ring-red-500/20",
    bar: "bg-red-400",
    pct: 84,
  },
  obesidade_3: {
    label: "Obesidade Grau III",
    color: "text-red-500",
    border: "border-red-600/30",
    bg: "bg-red-600/8",
    ring: "ring-red-600/20",
    bar: "bg-red-500",
    pct: 94,
  },
};

function getBmiCategory(bmi: number): BmiCategory {
  if (bmi < 18.5) return "magreza";
  if (bmi < 25) return "normal";
  if (bmi < 30) return "sobrepeso";
  if (bmi < 35) return "obesidade_1";
  if (bmi < 40) return "obesidade_2";
  return "obesidade_3";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calculateAge(birthDate: string): string {
  if (!birthDate) return "";
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 ? String(age) : "";
}

function calculateBmi(weight: string, height: string): number | null {
  const w = Number(weight.replace(",", "."));
  const h = Number(height.replace(",", "."));
  if (!w || !h) return null;
  const hm = h > 3 ? h / 100 : h;
  return Number((w / (hm * hm)).toFixed(1));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldLabel({
  icon: Icon,
  children,
}: {
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <label className="mb-2 flex items-center gap-1.5 text-xs font-medium text-zinc-400">
      <Icon className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
      {children}
    </label>
  );
}

function FieldError({ show }: { show: boolean }) {
  if (!show) return null;
  return <p className="mt-1.5 text-[11px] text-red-400">Campo obrigatório</p>;
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/6 bg-zinc-900/60">
      {children}
    </div>
  );
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-b border-white/6 px-5 py-3.5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        {children}
      </h3>
    </div>
  );
}

// ─── ProfileModal ─────────────────────────────────────────────────────────────

export function ProfileModal({
  isOpen,
  mode,
  profile,
  setProfile,
  onClose,
  onSave,
}: ProfileModalProps) {
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const isWelcome = mode === "welcome";

  function err(field: string) {
    return errors.includes(field);
  }

  function clearFieldError(field: string) {
    setErrors((e) => e.filter((f) => f !== field));
  }

  function updateField(field: keyof ProfileData, value: string) {
    setProfile((p) => ({ ...p, [field]: value }));
    clearFieldError(field);
    setSaved(false);
  }

  async function handleSave() {
    const newErrors: string[] = [];

    if (!profile.birthDate?.trim()) newErrors.push("birthDate");
    if (!profile.gender?.trim()) newErrors.push("gender");
    if (!profile.weight?.trim()) newErrors.push("weight");
    if (!profile.height?.trim()) newErrors.push("height");
    if (!profile.experienceLevel?.trim()) newErrors.push("experienceLevel");
    if (!profile.goal?.trim()) newErrors.push("goal");
    if (!profile.hasLimitations?.trim()) newErrors.push("hasLimitations");

    if (profile.goal === "outros" && !profile.customGoal?.trim()) {
      newErrors.push("customGoal");
    }

    if (profile.hasLimitations === "sim" && !profile.limitations?.trim()) {
      newErrors.push("limitations");
    }

    setErrors(newErrors);
    if (newErrors.length > 0) return;

    setSaving(true);
    await onSave();
    setSaving(false);
    setSaved(true);
  }

  const age = calculateAge(profile.birthDate ?? "");
  const bmiValue = calculateBmi(profile.weight ?? "", profile.height ?? "");
  const bmiCat = bmiValue ? getBmiCategory(bmiValue) : null;
  const bmiCfg = bmiCat ? BMI_MAP[bmiCat] : null;

  function inputCls(field: string) {
    return [
      "w-full rounded-xl border bg-zinc-950 px-3.5 py-2.5 text-sm text-white outline-none",
      "transition-colors duration-150 placeholder:text-zinc-600",
      "focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500/50",
      err(field)
        ? "border-red-500/50"
        : "border-zinc-800 hover:border-zinc-700",
    ].join(" ");
  }

  return (
    <div
      onClick={() => {
        if (!isWelcome) onClose();
      }}
      className="fixed inset-0 z-50 flex overflow-y-auto bg-black/70 px-4 py-6 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative m-auto w-full max-w-lg rounded-3xl border border-white/8 bg-zinc-950 shadow-2xl shadow-black/60"
      >
        {/* ── Modal header ── */}
        <div className="flex items-start gap-4 border-b border-white/6 px-6 py-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
            <Dumbbell className="h-6 w-6 text-emerald-400" />
          </div>
          <div className="flex-1 pt-0.5">
            <h2 className="text-lg font-bold leading-tight text-white">
              {isWelcome ? "Bem-vindo ao GymProgress IA" : "Meu Perfil"}
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              {isWelcome
                ? "Preencha seu perfil para receber recomendações personalizadas."
                : "Mantenha seus dados atualizados para treinos mais precisos."}
            </p>
          </div>
          {!isWelcome && (
            <button
              type="button"
              aria-label="Fechar"
              onClick={onClose}
              className="ml-2 mt-0.5 cursor-pointer rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-white/6 hover:text-zinc-300"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          )}
        </div>

        {/* ── Form body ── */}
        <div className="space-y-3 p-5">
          {/* 1 — Informações Básicas */}
          <SectionCard>
            <SectionHead>Informações Básicas</SectionHead>
            <div className="space-y-4 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Birth date */}
                <div>
                  <FieldLabel icon={Calendar}>Data de Nascimento</FieldLabel>
                  <input
                    type="date"
                    value={profile.birthDate ?? ""}
                    onChange={(e) => updateField("birthDate", e.target.value)}
                    className={inputCls("birthDate")}
                    style={{ colorScheme: "dark" }}
                  />
                  {age && (
                    <p className="mt-1.5 text-[11px] text-zinc-500">
                      {age} anos
                    </p>
                  )}
                  <FieldError show={err("birthDate")} />
                </div>

                {/* Gender */}
                <div>
                  <FieldLabel icon={User}>Gênero</FieldLabel>
                  <div className="relative">
                    <select
                      value={profile.gender ?? ""}
                      onChange={(e) => updateField("gender", e.target.value)}
                      className={`${inputCls("gender")} appearance-none pr-9`}
                      style={{ colorScheme: "dark" }}
                    >
                      <option value="">Selecione</option>
                      <option value="masculino">Masculino</option>
                      <option value="feminino">Feminino</option>
                      <option value="nao_informar">
                        Outros / Prefiro não dizer
                      </option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                  </div>
                  <FieldError show={err("gender")} />
                </div>

                {/* Weight */}
                <div>
                  <FieldLabel icon={Scale}>Peso (kg)</FieldLabel>
                  <input
                    type="number"
                    placeholder="75"
                    min={20}
                    max={300}
                    value={profile.weight ?? ""}
                    onChange={(e) => updateField("weight", e.target.value)}
                    className={inputCls("weight")}
                  />
                  <FieldError show={err("weight")} />
                </div>

                {/* Height */}
                <div>
                  <FieldLabel icon={Ruler}>Altura (cm)</FieldLabel>
                  <input
                    type="number"
                    placeholder="175"
                    min={100}
                    max={250}
                    value={profile.height ?? ""}
                    onChange={(e) => updateField("height", e.target.value)}
                    className={inputCls("height")}
                  />
                  <FieldError show={err("height")} />
                </div>
              </div>

              {/* BMI card */}
              {bmiValue && bmiCfg && (
                <div
                  className={`rounded-xl border p-4 ring-1 transition-all duration-300 ${bmiCfg.border} ${bmiCfg.bg} ${bmiCfg.ring}`}
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <p className={`text-sm font-bold ${bmiCfg.color}`}>
                        IMC: {bmiValue} kg/m²
                      </p>
                      <p className="mt-0.5 text-xs text-zwhite">
                        {bmiCfg.label}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${bmiCfg.color} border-current/20`}
                    >
                      {bmiCfg.label}
                    </span>
                  </div>

                  {/* Scale bar */}
                  <div className="relative h-2 overflow-hidden rounded-full bg-zinc-800">
                    <div className="absolute inset-y-0 left-0     w-[22%] bg-sky-500/35 rounded-l-full" />
                    <div className="absolute inset-y-0 left-[22%] w-[20%] bg-emerald-500/35" />
                    <div className="absolute inset-y-0 left-[42%] w-[18%] bg-amber-500/35" />
                    <div className="absolute inset-y-0 left-[60%] w-[15%] bg-orange-500/35" />
                    <div className="absolute inset-y-0 left-[75%] w-[13%] bg-red-500/35" />
                    <div className="absolute inset-y-0 left-[88%] w-[12%] bg-red-600/35 rounded-r-full" />
                    <div
                      className={`absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-zinc-950 shadow-md transition-all duration-500 ${bmiCfg.bar}`}
                      style={{ left: `${bmiCfg.pct}%` }}
                    />
                  </div>

                  <div className="mt-2 flex justify-between text-xs text-white">
                    <span>Magreza</span>
                    <span>Normal</span>
                    <span>Sobrepeso</span>
                    <span>Obesidade</span>
                  </div>

                  <p className="mt-2.5 text-xs leading-relaxed text-white">
                    Referência geral — interprete com um profissional de saúde.
                  </p>
                </div>
              )}
            </div>
          </SectionCard>

          {/* 2 — Nível de Experiência */}
          <SectionCard>
            <SectionHead>Nível de Experiência</SectionHead>
            <div className="p-5">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "iniciante", label: "Iniciante", emoji: "🌱" },
                  {
                    value: "intermediario",
                    label: "Intermediário",
                    emoji: "💪",
                  },
                  { value: "avancado", label: "Avançado", emoji: "🔥" },
                ].map(({ value, label, emoji }) => {
                  const active = (profile.experienceLevel ?? "") === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => updateField("experienceLevel", value)}
                      className={[
                        "flex flex-col items-center gap-2 rounded-xl border p-3.5 text-center cursor-pointer transition-all duration-150",
                        active
                          ? "border-emerald-500/40 bg-emerald-500/8 ring-1 ring-emerald-500/20"
                          : "border-zinc-800 bg-zinc-950 hover:border-zinc-700 hover:bg-zinc-900",
                      ].join(" ")}
                    >
                      <span className="text-2xl leading-none">{emoji}</span>
                      <div>
                        <p
                          className={`text-xs font-semibold ${active ? "text-emerald-400" : "text-zinc-300"}`}
                        >
                          {label}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
              {err("experienceLevel") && (
                <p className="mt-2 text-[11px] text-red-400">
                  Selecione seu nível
                </p>
              )}
            </div>
          </SectionCard>

          {/* 3 — Objetivo */}
          <SectionCard>
            <SectionHead>Objetivo Principal</SectionHead>
            <div className="space-y-3 p-5">
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    value: "perder_peso",
                    label: "Perder Peso",
                    Icon: TrendingDown,
                    sel: "border-sky-500/40 bg-sky-500/8 ring-sky-500/20",
                    ic: "bg-sky-500/10 text-sky-400",
                  },
                  {
                    value: "aumentar_musculos",
                    label: "Ganhar Músculo",
                    Icon: Dumbbell,
                    sel: "border-violet-500/40 bg-violet-500/8 ring-violet-500/20",
                    ic: "bg-violet-500/10 text-violet-400",
                  },
                  {
                    value: "definir_musculos",
                    label: "Definição",
                    Icon: Zap,
                    sel: "border-amber-500/40 bg-amber-500/8 ring-amber-500/20",
                    ic: "bg-amber-500/10 text-amber-400",
                  },
                  {
                    value: "outros",
                    label: "Outro objetivo",
                    Icon: Target,
                    sel: "border-zinc-600/50 bg-zinc-800/60 ring-zinc-700/30",
                    ic: "bg-zinc-700 text-zinc-300",
                  },
                ].map(({ value, label, Icon, sel, ic }) => {
                  const active = (profile.goal ?? "") === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        updateField("goal", value);
                        if (value !== "outros") updateField("customGoal", "");
                      }}
                      className={[
                        "flex items-center gap-3 rounded-xl border p-3.5 text-left cursor-pointer transition-all duration-150",
                        active
                          ? `${sel} ring-1`
                          : "border-zinc-800 bg-zinc-950 hover:border-zinc-700 hover:bg-zinc-900",
                      ].join(" ")}
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-150 ${active ? ic : "bg-zinc-800 text-zinc-500"}`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span
                        className={`flex-1 text-xs font-medium ${active ? "text-white" : "text-zinc-400"}`}
                      >
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {err("goal") && (
                <p className="text-[11px] text-red-400">
                  Selecione um objetivo
                </p>
              )}

              {profile.goal === "outros" && (
                <textarea
                  placeholder="Descreva seu objetivo..."
                  value={profile.customGoal ?? ""}
                  onChange={(e) => updateField("customGoal", e.target.value)}
                  className={[
                    "w-full resize-none rounded-xl border bg-zinc-950 px-3.5 py-2.5 text-sm text-white outline-none",
                    "transition-colors placeholder:text-zinc-600",
                    "hover:border-zinc-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 min-h-[80px]",
                    err("customGoal") ? "border-red-500/50" : "border-zinc-800",
                  ].join(" ")}
                />
              )}
              <FieldError show={err("customGoal")} />
            </div>
          </SectionCard>

          {/* 4 — Restrições */}
          <SectionCard>
            <SectionHead>Restrições e Limitações</SectionHead>
            <div className="space-y-3 p-5">
              <p className="text-xs text-zinc-500">
                Você possui alguma restrição física ou lesão?
              </p>

              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    value: "nao",
                    label: "Não",
                    emoji: "✅",
                    selCls:
                      "border-emerald-500/40 bg-emerald-500/8 ring-1 ring-emerald-500/20",
                  },
                  {
                    value: "sim",
                    label: "Sim",
                    emoji: "⚠️",
                    selCls:
                      "border-amber-500/40 bg-amber-500/8 ring-1 ring-amber-500/20",
                  },
                ].map(({ value, label, emoji, selCls }) => {
                  const active = (profile.hasLimitations ?? "") === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        updateField("hasLimitations", value);
                        if (value === "nao") updateField("limitations", "");
                      }}
                      className={[
                        "flex items-center gap-3 rounded-xl border p-3.5 text-left cursor-pointer transition-all duration-150",
                        active
                          ? selCls
                          : "border-zinc-800 bg-zinc-950 hover:border-zinc-700 hover:bg-zinc-900",
                      ].join(" ")}
                    >
                      <span className="text-lg leading-none">{emoji}</span>
                      <span
                        className={`text-xs font-medium ${active ? "text-white" : "text-zinc-400"}`}
                      >
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {err("hasLimitations") && (
                <p className="text-[11px] text-red-400">Selecione uma opção</p>
              )}

              {profile.hasLimitations === "sim" && (
                <div>
                  <label className="mb-2 flex items-center gap-1.5 text-xs font-medium text-zinc-400">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                    Descreva suas restrições
                  </label>
                  <textarea
                    placeholder="Ex.: dor no joelho, lesão no ombro, hérnia de disco..."
                    value={profile.limitations ?? ""}
                    onChange={(e) => updateField("limitations", e.target.value)}
                    className={[
                      "w-full resize-none rounded-xl border bg-zinc-950 px-3.5 py-2.5 text-sm text-white outline-none",
                      "transition-colors placeholder:text-zinc-600",
                      "hover:border-zinc-700 focus:border-amber-500/40 focus:ring-2 focus:ring-amber-500/10 min-h-[80px]",
                      err("limitations")
                        ? "border-red-500/50"
                        : "border-zinc-800",
                    ].join(" ")}
                  />
                  <FieldError show={err("limitations")} />
                </div>
              )}
            </div>
          </SectionCard>

          {/* ── Buttons ── */}
          <div className="flex flex-col gap-2 pt-1 sm:flex-row">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className={[
                "flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-full py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.985] disabled:opacity-60",
                saved
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/15"
                  : "bg-emerald-500 text-white shadow-lg shadow-emerald-500/15 hover:bg-emerald-400",
              ].join(" ")}
            >
              {saved ? (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Perfil Salvo!
                </>
              ) : saving ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />{" "}
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Salvar Perfil
                </>
              )}
            </button>

            {!isWelcome && (
              <button
                type="button"
                onClick={onClose}
                className="w-full cursor-pointer rounded-full border border-white/8 py-3 text-sm font-semibold text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-200"
              >
                Cancelar
              </button>
            )}
          </div>

          <p className="text-center text-xs text-white">
            Seus dados são usados apenas para personalizar seus treinos.
          </p>
        </div>
      </div>
    </div>
  );
}
