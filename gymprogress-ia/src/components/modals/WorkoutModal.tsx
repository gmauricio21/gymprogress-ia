"use client";

import { useCallback, useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import {
  ClipboardList,
  Plus,
  Trash2,
  X,
  Copy,
  Save,
  Pencil,
} from "lucide-react";

const API = "http://localhost:3001/workout";

type Toast = { message: string };

type Workout = { id: string; name: string; goal: string };
type Day = { id: string; name: string };
type Exercise = {
  id: string;
  name: string;
  muscle?: string;
  load?: string;
  sets?: string;
  reps?: string;
  rest?: string;
  duration?: string;
  notes?: string;
};

type View = "workouts" | "days" | "exercises";

type WorkoutModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function WorkoutModal({ isOpen, onClose }: WorkoutModalProps) {
  const [view, setView] = useState<View>("workouts");
  const [toast, setToast] = useState<Toast | null>(null);

  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);

  const [days, setDays] = useState<Day[]>([]);
  const [selectedDay, setSelectedDay] = useState<Day | null>(null);

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);

  // Formulário treino
  const [workoutName, setWorkoutName] = useState("");
  const [workoutGoal, setWorkoutGoal] = useState("");

  // Formulário dia
  const [dayName, setDayName] = useState("");

  // Formulário exercício
  const [exForm, setExForm] = useState({
    name: "",
    muscle: "",
    load: "",
    sets: "",
    reps: "",
    rest: "",
    duration: "",
    notes: "",
    noLoad: false,
  });

  function showToast(message: string) {
    setToast({ message });
    setTimeout(() => setToast(null), 3000);
  }

  async function getToken() {
    return auth.currentUser?.getIdToken();
  }

  function resetExForm() {
    setExForm({
      name: "",
      muscle: "",
      load: "",
      sets: "",
      reps: "",
      rest: "",
      duration: "",
      notes: "",
      noLoad: false,
    });
    setEditingExercise(null);
  }

  // ─── TREINOS ───────────────────────────────────────────

  const loadWorkouts = useCallback(async () => {
    const token = await getToken();
    const res = await fetch(API, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setWorkouts(await res.json());
  }, []);

  async function handleCreateWorkout() {
    console.log("workoutName:", workoutName, "workoutGoal:", workoutGoal);
    if (!workoutName.trim() || !workoutGoal.trim()) return;
    const token = await getToken();
    const res = await fetch(API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: workoutName, goal: workoutGoal }),
    });
    if (res.ok) {
      setWorkoutName("");
      setWorkoutGoal("");
      await loadWorkouts();
      showToast("Treino criado!");
    }
  }

  async function handleDeleteWorkout(workoutId: string) {
    const token = await getToken();
    const res = await fetch(`${API}/${workoutId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      await loadWorkouts();
      showToast("Treino excluído!");
    }
  }

  async function handleOpenWorkout(workout: Workout) {
    setSelectedWorkout(workout);
    setView("days");
    const token = await getToken();
    const res = await fetch(`${API}/${workout.id}/days`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setDays(await res.json());
  }

  // ─── DIAS ──────────────────────────────────────────────

  async function handleCreateDay() {
    if (!dayName.trim() || !selectedWorkout) return;
    const token = await getToken();
    const res = await fetch(`${API}/${selectedWorkout.id}/days`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: dayName }),
    });
    if (res.ok) {
      setDayName("");
      const r = await fetch(`${API}/${selectedWorkout.id}/days`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) setDays(await r.json());
      showToast("Dia adicionado!");
    }
  }

  async function handleDeleteDay(dayId: string) {
    if (!selectedWorkout) return;
    const token = await getToken();
    const res = await fetch(`${API}/${selectedWorkout.id}/days/${dayId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const r = await fetch(`${API}/${selectedWorkout.id}/days`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) setDays(await r.json());
      showToast("Dia excluído!");
    }
  }

  async function handleOpenDay(day: Day) {
    setSelectedDay(day);
    setView("exercises");
    const token = await getToken();
    const res = await fetch(
      `${API}/${selectedWorkout!.id}/days/${day.id}/exercises`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (res.ok) setExercises(await res.json());
  }

  // ─── EXERCÍCIOS ────────────────────────────────────────

  async function handleSaveExercise() {
    if (!exForm.name.trim() || !selectedWorkout || !selectedDay) return;
    const token = await getToken();

    const payload = {
      name: exForm.name,
      muscle: exForm.muscle,
      load: exForm.noLoad ? "" : exForm.load,
      sets: exForm.sets,
      reps: exForm.reps,
      rest: exForm.rest,
      duration: exForm.duration,
      notes: exForm.notes,
    };

    if (editingExercise) {
      const res = await fetch(
        `${API}/${selectedWorkout.id}/days/${selectedDay.id}/exercises/${editingExercise.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );
      if (res.ok) {
        resetExForm();
        await reloadExercises(token!);
        showToast("Exercício salvo!");
      }
    } else {
      const res = await fetch(
        `${API}/${selectedWorkout.id}/days/${selectedDay.id}/exercises`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );
      if (res.ok) {
        resetExForm();
        await reloadExercises(token!);
        showToast("Exercício adicionado!");
      }
    }
  }

  async function reloadExercises(token: string) {
    const res = await fetch(
      `${API}/${selectedWorkout!.id}/days/${selectedDay!.id}/exercises`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (res.ok) setExercises(await res.json());
  }

  async function handleDeleteExercise(exerciseId: string) {
    if (!selectedWorkout || !selectedDay) return;
    const token = await getToken();
    const res = await fetch(
      `${API}/${selectedWorkout.id}/days/${selectedDay.id}/exercises/${exerciseId}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
    );
    if (res.ok) {
      await reloadExercises(token!);
      showToast("Exercício excluído!");
    }
  }

  function handleEditExercise(ex: Exercise) {
    setEditingExercise(ex);
    setExForm({
      name: ex.name,
      muscle: ex.muscle ?? "",
      load: ex.load ?? "",
      sets: ex.sets ?? "",
      reps: ex.reps ?? "",
      rest: ex.rest ?? "",
      duration: ex.duration ?? "",
      notes: ex.notes ?? "",
      noLoad: !ex.load,
    });
  }

  function handleCopyExercise(ex: Exercise) {
    setExForm({
      name: ex.name,
      muscle: ex.muscle ?? "",
      load: ex.load ?? "",
      sets: ex.sets ?? "",
      reps: ex.reps ?? "",
      rest: ex.rest ?? "",
      duration: ex.duration ?? "",
      notes: ex.notes ?? "",
      noLoad: !ex.load,
    });
    setEditingExercise(null);
    showToast("Exercício copiado para o formulário!");
  }

  // ─── RESUMO ────────────────────────────────────────────

  async function handleCopySummary() {
    if (!selectedWorkout) return;
    const token = await getToken();
    const res = await fetch(`${API}/${selectedWorkout.id}/summary`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      await navigator.clipboard.writeText(data.summary);
      showToast("Resumo copiado!");
    }
  }

  async function handleSaveToClipboard() {
    await handleCopySummary();
  }

  useEffect(() => {
    if (isOpen) void loadWorkouts();
  }, [isOpen, loadWorkouts]);

  if (!isOpen) return null;

  const inputClass =
    "h-9 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 text-xs text-white outline-none placeholder:text-zinc-600 focus:border-emerald-500/50";

  const textareaClass =
    "w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-white outline-none placeholder:text-zinc-600 focus:border-emerald-500/50 resize-none min-h-16";

  return (
    <div className="fixed inset-0 z-50 flex overflow-y-auto bg-black/60 px-4 py-5 backdrop-blur-sm sm:px-6">
      {/* Toast */}
      {toast && (
        <div className="fixed right-4 top-4 z-[60] rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-lg">
          {toast.message}
        </div>
      )}

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative m-auto w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-2xl sm:p-6"
      >
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
            <ClipboardList size={22} />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">Organizar Ficha de Treino</h2>
            <nav className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500">
              <button
                type="button"
                onClick={() => {
                  setView("workouts");
                  setSelectedWorkout(null);
                  setSelectedDay(null);
                }}
                className="hover:text-emerald-400 transition"
              >
                Treinos
              </button>
              {selectedWorkout && (
                <>
                  <span>/</span>
                  <button
                    type="button"
                    onClick={() => {
                      setView("days");
                      setSelectedDay(null);
                    }}
                    className="hover:text-emerald-400 transition"
                  >
                    {selectedWorkout.name}
                  </button>
                </>
              )}
              {selectedDay && (
                <>
                  <span>/</span>
                  <span className="text-zinc-400">{selectedDay.name}</span>
                </>
              )}
            </nav>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-zinc-400 transition hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── VIEW: TREINOS ── */}
        {view === "workouts" && (
          <div className="space-y-3">
            <div className="rounded-xl border border-white/10 bg-zinc-900/70 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">
                  Seus treinos
                </h3>
                <span className="text-xs text-zinc-500">
                  Crie planos personalizados para cada objetivo
                </span>
              </div>

              {/* Form novo treino */}
              <div className="mb-3 flex gap-2">
                <input
                  className={inputClass + " flex-1"}
                  placeholder="Nome do treino (ex.: Plano de Força)"
                  value={workoutName}
                  onChange={(e) => {
                    console.log("nome:", e.target.value);
                    setWorkoutName(e.target.value);
                  }}
                />
                <input
                  className={inputClass + " flex-1"}
                  placeholder="Objetivo (ex.: perder peso, ganhar massa)"
                  value={workoutGoal}
                  onChange={(e) => {
                    console.log("objetivo:", e.target.value);
                    setWorkoutGoal(e.target.value);
                  }}
                />
                <button
                  type="button"
                  onClick={handleCreateWorkout}
                  className="flex h-9 shrink-0 cursor-pointer items-center gap-1 rounded-lg bg-emerald-500 px-3 text-xs font-semibold text-white transition hover:bg-emerald-600"
                >
                  <Plus size={14} />
                  Criar treino
                </button>
              </div>

              {/* Lista */}
              {workouts.length === 0 ? (
                <p className="py-4 text-center text-xs text-zinc-600">
                  Nenhum treino cadastrado.
                </p>
              ) : (
                <div className="space-y-2">
                  {workouts.map((w) => (
                    <div
                      key={w.id}
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-zinc-950 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">
                          {w.name}
                        </p>
                        <p className="text-xs text-zinc-500">
                          Objetivo: {w.goal}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenWorkout(w)}
                          className="flex cursor-pointer items-center gap-1 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 transition hover:bg-emerald-500/20"
                        >
                          Abrir
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteWorkout(w.id)}
                          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-zinc-600 transition hover:bg-red-500/10 hover:text-red-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Rodapé */}
            <div className="flex justify-between gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 cursor-pointer rounded-full border border-white/10 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-white/10"
              >
                Fechar
              </button>
            </div>
          </div>
        )}

        {/* ── VIEW: DIAS ── */}
        {view === "days" && selectedWorkout && (
          <div className="space-y-3">
            <div className="rounded-xl border border-white/10 bg-zinc-900/70 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    {selectedWorkout.name}{" "}
                    <span className="font-normal text-zinc-400">
                      ({selectedWorkout.goal})
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Configure os dias do plano escolhido
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleDeleteWorkout(selectedWorkout.id).then(() => {
                      setView("workouts");
                      setSelectedWorkout(null);
                    })
                  }
                  className="flex cursor-pointer items-center gap-1 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/20"
                >
                  <Trash2 size={12} />
                  Excluir treino
                </button>
              </div>

              {/* Form novo dia */}
              <div className="mb-3 flex gap-2">
                <input
                  className={inputClass + " flex-1"}
                  placeholder="Nome do dia (ex.: Cardio Intenso)"
                  value={dayName}
                  onChange={(e) => setDayName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateDay();
                  }}
                />
                <button
                  type="button"
                  onClick={handleCreateDay}
                  className="flex h-9 shrink-0 cursor-pointer items-center gap-1 rounded-lg bg-emerald-500 px-3 text-xs font-semibold text-white transition hover:bg-emerald-600"
                >
                  <Plus size={14} />
                  Adicionar dia
                </button>
              </div>

              {/* Lista dias */}
              {days.length === 0 ? (
                <p className="py-4 text-center text-xs text-zinc-600">
                  Nenhum dia adicionado ainda.
                </p>
              ) : (
                <div className="space-y-2">
                  {days.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-zinc-950 px-3 py-2"
                    >
                      <p className="text-sm font-medium text-white">{d.name}</p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenDay(d)}
                          className="flex cursor-pointer items-center gap-1 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 transition hover:bg-emerald-500/20"
                        >
                          Abrir
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDay(d.id)}
                          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-zinc-600 transition hover:bg-red-500/10 hover:text-red-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Rodapé */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 cursor-pointer rounded-full border border-white/10 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-white/10"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={handleCopySummary}
                className="flex cursor-pointer items-center gap-1.5 rounded-full bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-700"
              >
                <Copy size={14} />
                Copiar resumo
              </button>
              <button
                type="button"
                onClick={handleSaveToClipboard}
                className="flex cursor-pointer items-center gap-1.5 rounded-full bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-400 transition hover:bg-emerald-500/20"
              >
                <Save size={14} />
                Salvar
              </button>
            </div>
          </div>
        )}

        {/* ── VIEW: EXERCÍCIOS ── */}
        {view === "exercises" && selectedWorkout && selectedDay && (
          <div className="space-y-3">
            <div className="rounded-xl border border-white/10 bg-zinc-900/70 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    {selectedDay.name}
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Cadastre exercícios e observações para este dia
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleDeleteDay(selectedDay.id).then(() => {
                      setView("days");
                      setSelectedDay(null);
                    })
                  }
                  className="flex cursor-pointer items-center gap-1 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/20"
                >
                  <Trash2 size={12} />
                  Excluir dia
                </button>
              </div>

              {/* Form exercício */}
              <div className="mb-3 space-y-2">
                <p className="text-xs font-semibold text-zinc-300">
                  {editingExercise
                    ? "Editando exercício"
                    : "Adicionar exercício"}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <input
                    className={inputClass}
                    placeholder="Exercício (ex.: Supino)"
                    value={exForm.name}
                    onChange={(e) =>
                      setExForm({ ...exForm, name: e.target.value })
                    }
                  />
                  <input
                    className={inputClass}
                    placeholder="Músculo (ex.: Peito)"
                    value={exForm.muscle}
                    onChange={(e) =>
                      setExForm({ ...exForm, muscle: e.target.value })
                    }
                  />
                  <input
                    className={inputClass}
                    placeholder="Carga (kg) ou deixe vazio"
                    value={exForm.load}
                    disabled={exForm.noLoad}
                    onChange={(e) =>
                      setExForm({ ...exForm, load: e.target.value })
                    }
                  />
                  <input
                    className={inputClass}
                    placeholder="Séries (ex.: 4)"
                    value={exForm.sets}
                    onChange={(e) =>
                      setExForm({ ...exForm, sets: e.target.value })
                    }
                  />
                  <input
                    className={inputClass}
                    placeholder="Repetições (ex.: 12)"
                    value={exForm.reps}
                    onChange={(e) =>
                      setExForm({ ...exForm, reps: e.target.value })
                    }
                  />
                  <input
                    className={inputClass}
                    placeholder="Descanso (ex.: 60s)"
                    value={exForm.rest}
                    onChange={(e) =>
                      setExForm({ ...exForm, rest: e.target.value })
                    }
                  />
                  <input
                    className={inputClass}
                    placeholder="Tempo (ex.: 15 min)"
                    value={exForm.duration}
                    onChange={(e) =>
                      setExForm({ ...exForm, duration: e.target.value })
                    }
                  />
                  <label className="flex items-center gap-2 text-xs text-zinc-400">
                    <input
                      type="checkbox"
                      checked={exForm.noLoad}
                      onChange={(e) =>
                        setExForm({
                          ...exForm,
                          noLoad: e.target.checked,
                          load: "",
                        })
                      }
                    />
                    Sem carga
                  </label>
                </div>
                <textarea
                  className={textareaClass}
                  placeholder="Observações (técnica, variações, etc.)"
                  value={exForm.notes}
                  onChange={(e) =>
                    setExForm({ ...exForm, notes: e.target.value })
                  }
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveExercise}
                    className="flex cursor-pointer items-center gap-1 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-600"
                  >
                    <Plus size={13} />
                    {editingExercise
                      ? "Salvar alterações"
                      : "Adicionar exercício"}
                  </button>
                  <button
                    type="button"
                    onClick={resetExForm}
                    className="cursor-pointer rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-zinc-400 transition hover:bg-white/10"
                  >
                    Limpar campos
                  </button>
                </div>
              </div>

              {/* Lista exercícios */}
              {exercises.length === 0 ? (
                <p className="py-3 text-center text-xs text-zinc-600">
                  Nenhum exercício adicionado ainda.
                </p>
              ) : (
                <div className="space-y-2">
                  {exercises.map((ex) => (
                    <div
                      key={ex.id}
                      className="rounded-lg border border-white/10 bg-zinc-950 px-3 py-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {ex.name}
                          </p>
                          <p className="mt-0.5 text-xs text-zinc-500">
                            {[
                              ex.muscle,
                              ex.sets && `${ex.sets} séries`,
                              ex.reps && `${ex.reps} reps`,
                              ex.duration && `${ex.duration}`,
                              ex.rest && `${ex.rest} descanso`,
                              ex.load && `${ex.load} kg`,
                            ]
                              .filter(Boolean)
                              .join(" • ")}
                          </p>
                          {ex.notes && (
                            <p className="mt-1 text-xs text-zinc-400">
                              {ex.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditExercise(ex)}
                            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/10 hover:text-white"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyExercise(ex)}
                            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/10 hover:text-white"
                          >
                            <Copy size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteExercise(ex.id)}
                            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-zinc-600 transition hover:bg-red-500/10 hover:text-red-400"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Rodapé */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 cursor-pointer rounded-full border border-white/10 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-white/10"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={handleCopySummary}
                className="flex cursor-pointer items-center gap-1.5 rounded-full bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-700"
              >
                <Copy size={14} />
                Copiar resumo
              </button>
              <button
                type="button"
                onClick={handleSaveToClipboard}
                className="flex cursor-pointer items-center gap-1.5 rounded-full bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-400 transition hover:bg-emerald-500/20"
              >
                <Save size={14} />
                Salvar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
