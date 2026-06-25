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
  ArrowLeft,
} from "lucide-react";

const API = "http://localhost:3001/workout";

type Toast = { message: string; type: "success" | "error" };

type Workout = { id: string; name: string; goal: string };
type Division = { id: string; name: string };
type Exercise = {
  id: string;
  name: string;
  muscle?: string;
  load?: number;
  sets?: number;
  reps?: number;
  rest?: number;
  duration?: number;
  notes?: string;
};

type View = "workouts" | "divisions" | "exercises";

type DeleteTarget = {
  type: "workout" | "division" | "exercise";
  id: string;
  name: string;
};

type WorkoutModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function WorkoutModal({ isOpen, onClose }: WorkoutModalProps) {
  const [view, setView] = useState<View>("workouts");
  const [toast, setToast] = useState<Toast | null>(null);

  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);

  const [divisions, setDivisions] = useState<Division[]>([]);
  const [selectedDivision, setSelectedDivision] = useState<Division | null>(
    null,
  );

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [workoutName, setWorkoutName] = useState("");
  const [workoutGoal, setWorkoutGoal] = useState("");
  const [workoutErrors, setWorkoutErrors] = useState<string[]>([]);
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [editingDivision, setEditingDivision] = useState<Division | null>(null);

  const [divisionName, setDivisionName] = useState("");
  const [divisionError, setDivisionError] = useState(false);

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

  /**
   * Exibe uma mensagem temporária de sucesso ou erro na tela.
   */
  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  /**
   * Recupera o token do usuário autenticado para autorizar
   * as requisições ao backend.
   */
  async function getToken() {
    return auth.currentUser?.getIdToken();
  }

  /**
   * Limpa o formulário de exercício e sai do modo de edição.
   */
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
  /**
   * Busca todos os treinos cadastrados pelo usuário.
   */
  const fetchWorkouts = useCallback(async () => {
    const token = await getToken();
    const res = await fetch(API, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) return [];

    return res.json() as Promise<Workout[]>;
  }, []);

  /**
   * Carrega os treinos e atualiza a lista exibida no modal.
   */
  const loadWorkouts = useCallback(async () => {
    const data = await fetchWorkouts();
    setWorkouts(data);
  }, [fetchWorkouts]);

  /**
   * Valida os campos e cria um novo treino.
   */
  async function handleCreateWorkout() {
    const newErrors: string[] = [];
    if (!workoutName.trim()) newErrors.push("name");
    if (!workoutGoal.trim()) newErrors.push("goal");

    setWorkoutErrors(newErrors);
    if (newErrors.length > 0) return;

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

  /**
   * Exclui um treino pelo ID informado.
   */
  async function handleDeleteWorkout(workoutId: string) {
    const token = await getToken();
    const res = await fetch(`${API}/${workoutId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      await loadWorkouts();
      showToast("Treino excluído!", "error");
    }
  }

  /**
   * Atualiza os dados do treino que está em edição.
   */
  async function handleUpdateWorkout() {
    const newErrors: string[] = [];
    if (!workoutName.trim()) newErrors.push("name");
    if (!workoutGoal.trim()) newErrors.push("goal");

    setWorkoutErrors(newErrors);
    if (newErrors.length > 0) return;
    if (!editingWorkout) return;

    const token = await getToken();
    const res = await fetch(`${API}/${editingWorkout.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: workoutName, goal: workoutGoal }),
    });

    if (res.ok) {
      setWorkoutName("");
      setWorkoutGoal("");
      setEditingWorkout(null);
      await loadWorkouts();
      showToast("Treino atualizado!");
    }
  }

  /**
   * Abre um treino e carrega suas divisões.
   */
  async function handleOpenWorkout(workout: Workout) {
    setSelectedWorkout(workout);
    setView("divisions");
    const token = await getToken();
    const res = await fetch(`${API}/${workout.id}/divisions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setDivisions(await res.json());
  }

  // ─── DIVISÕES ──────────────────────────────────────────
  /**
   * Cria uma nova divisão dentro do treino selecionado.
   */
  async function handleCreateDivision() {
    if (!divisionName.trim()) {
      setDivisionError(true);
      return;
    }
    if (!selectedWorkout) return;
    const token = await getToken();
    const res = await fetch(`${API}/${selectedWorkout.id}/divisions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: divisionName }),
    });
    if (res.ok) {
      setDivisionName("");
      const r = await fetch(`${API}/${selectedWorkout.id}/divisions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) setDivisions(await r.json());
      showToast("Divisão adicionada!");
    }
  }

  /**
   * Exclui uma divisão do treino selecionado.
   */
  async function handleDeleteDivision(divisionId: string) {
    if (!selectedWorkout) return;
    const token = await getToken();
    const res = await fetch(
      `${API}/${selectedWorkout.id}/divisions/${divisionId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (res.ok) {
      const r = await fetch(`${API}/${selectedWorkout.id}/divisions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) setDivisions(await r.json());
      showToast("Divisão excluída!", "error");
    }
  }

  /**
   * Atualiza o nome da divisão que está em edição.
   */
  async function handleUpdateDivision() {
    if (!divisionName.trim()) {
      setDivisionError(true);
      return;
    }
    if (!selectedWorkout || !editingDivision) return;

    const token = await getToken();
    const res = await fetch(
      `${API}/${selectedWorkout.id}/divisions/${editingDivision.id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: divisionName }),
      },
    );

    if (res.ok) {
      setDivisionName("");
      setEditingDivision(null);
      const r = await fetch(`${API}/${selectedWorkout.id}/divisions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) setDivisions(await r.json());
      showToast("Divisão atualizada!");
    }
  }

  /**
   * Abre uma divisão e carrega seus exercícios.
   */
  async function handleOpenDivision(division: Division) {
    setSelectedDivision(division);
    setView("exercises");
    const token = await getToken();
    const res = await fetch(
      `${API}/${selectedWorkout!.id}/divisions/${division.id}/exercises`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (res.ok) setExercises(await res.json());
  }

  // ─── EXERCÍCIOS ────────────────────────────────────────
  /**
   * Cria ou atualiza um exercício.
   *
   * Se houver um exercício em edição, atualiza os dados.
   * Caso contrário, cadastra um novo exercício na divisão selecionada.
   */
  async function handleSaveExercise() {
    if (!exForm.name.trim() || !selectedWorkout || !selectedDivision) return;
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
        `${API}/${selectedWorkout.id}/divisions/${selectedDivision.id}/exercises/${editingExercise.id}`,
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
        `${API}/${selectedWorkout.id}/divisions/${selectedDivision.id}/exercises`,
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

  /**
   * Recarrega os exercícios da divisão selecionada.
   */
  async function reloadExercises(token: string) {
    const res = await fetch(
      `${API}/${selectedWorkout!.id}/divisions/${selectedDivision!.id}/exercises`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (res.ok) setExercises(await res.json());
  }

  /**
   * Exclui um exercício da divisão atual.
   */
  async function handleDeleteExercise(exerciseId: string) {
    if (!selectedWorkout || !selectedDivision) return;
    const token = await getToken();
    const res = await fetch(
      `${API}/${selectedWorkout.id}/divisions/${selectedDivision.id}/exercises/${exerciseId}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
    );
    if (res.ok) {
      await reloadExercises(token!);
      showToast("Exercício excluído!", "error");
    }
  }

  /**
   * Preenche o formulário com os dados do exercício selecionado
   * para permitir sua edição.
   */
  function handleEditExercise(ex: Exercise) {
    setEditingExercise(ex);
    setExForm({
      name: ex.name,
      muscle: ex.muscle ?? "",
      load: ex.load !== undefined && ex.load !== null ? String(ex.load) : "",
      sets: ex.sets !== undefined && ex.sets !== null ? String(ex.sets) : "",
      reps: ex.reps !== undefined && ex.reps !== null ? String(ex.reps) : "",
      rest: ex.rest !== undefined && ex.rest !== null ? String(ex.rest) : "",
      duration:
        ex.duration !== undefined && ex.duration !== null
          ? String(ex.duration)
          : "",
      notes: ex.notes ?? "",
      noLoad: !ex.load,
    });
  }

  /**
   * Copia os dados de um exercício para o formulário,
   * permitindo criar outro exercício parecido.
   */
  function handleCopyExercise(ex: Exercise) {
    setExForm({
      name: ex.name,
      muscle: ex.muscle ?? "",
      load: ex.load !== undefined && ex.load !== null ? String(ex.load) : "",
      sets: ex.sets !== undefined && ex.sets !== null ? String(ex.sets) : "",
      reps: ex.reps !== undefined && ex.reps !== null ? String(ex.reps) : "",
      rest: ex.rest !== undefined && ex.rest !== null ? String(ex.rest) : "",
      duration:
        ex.duration !== undefined && ex.duration !== null
          ? String(ex.duration)
          : "",
      notes: ex.notes ?? "",
      noLoad: !ex.load,
    });
    setEditingExercise(null);
    showToast("Exercício copiado para o formulário!");
  }

  // ─── EXCLUSÃO (com confirmação) ────────────────────────
  /**
   * Define qual item será excluído e abre o modal de confirmação.
   */
  function requestDelete(target: DeleteTarget) {
    setDeleteTarget(target);
  }

  /**
   * Confirma a exclusão do item selecionado.
   *
   * A função identifica se o alvo é treino, divisão ou exercício
   * e executa a exclusão correspondente.
   */
  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      if (deleteTarget.type === "workout") {
        await handleDeleteWorkout(deleteTarget.id);
        if (selectedWorkout?.id === deleteTarget.id) {
          setView("workouts");
          setSelectedWorkout(null);
          setSelectedDivision(null);
        }
      } else if (deleteTarget.type === "division") {
        await handleDeleteDivision(deleteTarget.id);
        if (selectedDivision?.id === deleteTarget.id) {
          setView("divisions");
          setSelectedDivision(null);
        }
      } else if (deleteTarget.type === "exercise") {
        await handleDeleteExercise(deleteTarget.id);
      }
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }

  // ─── RESUMO ────────────────────────────────────────────
  /**
   * Gera um resumo textual da ficha de treino e copia
   * para a área de transferência do usuário.
   */
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
    if (!isOpen) return;

    let ignore = false;

    async function initModal() {
      const data = await fetchWorkouts();

      if (ignore) return;

      setWorkouts(data);
      setWorkoutErrors([]);
      setWorkoutName("");
      setWorkoutGoal("");
      setDivisionName("");
      setEditingWorkout(null);
      setEditingDivision(null);
      setDivisionError(false);
    }

    void initModal();

    return () => {
      ignore = true;
    };
  }, [isOpen, fetchWorkouts]);

  function handleClose() {
    setView("workouts");
    setSelectedWorkout(null);
    setSelectedDivision(null);
    setWorkoutErrors([]);
    setWorkoutName("");
    setWorkoutGoal("");
    setDivisionName("");
    setDivisionError(false);
    setEditingWorkout(null);
    setEditingDivision(null);
    onClose();
  }

  function handleBack() {
    if (view === "exercises") {
      setView("divisions");
      setSelectedDivision(null);
      setDivisionName("");
      setDivisionError(false);
      setEditingDivision(null);
    } else if (view === "divisions") {
      setView("workouts");
      setSelectedWorkout(null);
      setWorkoutErrors([]);
      setDivisionName("");
      setDivisionError(false);
      setEditingDivision(null);
    }
  }

  if (!isOpen) return null;

  const inputClass =
    "h-10 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-emerald-500/50";

  const textareaClass =
    "w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-emerald-500/50 resize-none min-h-20";

  return (
    <div className="fixed inset-0 z-50 flex overflow-y-auto bg-black/60 px-4 py-5 backdrop-blur-sm sm:px-6">
      {toast && (
        <div
          className={`fixed right-4 top-4 z-[60] rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-lg ${
            toast.type === "error" ? "bg-red-500" : "bg-emerald-500"
          }`}
        >
          {toast.message}
        </div>
      )}

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative m-auto flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 p-5 pb-4 sm:p-6 sm:pb-4">
          {view !== "workouts" && (
            <button
              type="button"
              onClick={handleBack}
              aria-label="Voltar"
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-zinc-400 transition hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft size={18} />
            </button>
          )}

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
            <ClipboardList size={22} />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold">Organizar Ficha de Treino</h2>
            <nav className="mt-0.5 flex items-center gap-1 truncate text-xs text-zinc-500">
              {view === "workouts" ? (
                <span className="text-zinc-400">Treinos</span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setView("workouts");
                    setSelectedWorkout(null);
                    setSelectedDivision(null);
                    setWorkoutErrors([]);
                    setDivisionName("");
                    setDivisionError(false);
                    setEditingDivision(null);
                  }}
                  className="cursor-pointer transition hover:text-emerald-400"
                >
                  Treinos
                </button>
              )}
              {selectedWorkout && (
                <>
                  <span>/</span>
                  {view === "divisions" ? (
                    <span className="truncate text-zinc-400">
                      {selectedWorkout.name}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setView("divisions");
                        setSelectedDivision(null);
                        setDivisionName("");
                        setDivisionError(false);
                      }}
                      className="cursor-pointer truncate transition hover:text-emerald-400"
                    >
                      {selectedWorkout.name}
                    </button>
                  )}
                </>
              )}
              {selectedDivision && (
                <>
                  <span>/</span>
                  <span className="truncate text-zinc-400">
                    {selectedDivision.name}
                  </span>
                </>
              )}
            </nav>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-zinc-400 transition hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Conteúdo rolável */}
        <div className="custom-scrollbar flex-1 overflow-y-auto p-5 pt-0 sm:p-6 sm:pt-0">
          {/* ── VIEW: TREINOS ── */}
          {view === "workouts" && (
            <div className="space-y-3">
              <div className="rounded-xl border border-white/10 bg-zinc-900/70 p-4">
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-white">
                    Seus treinos
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Crie planos personalizados para cada objetivo
                  </p>
                </div>

                <div className="mb-4 space-y-2">
                  {editingWorkout && (
                    <p className="text-xs font-semibold text-emerald-400">
                      Editando: {editingWorkout.name}
                    </p>
                  )}
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      className={`h-10 w-full rounded-lg border bg-zinc-950 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-emerald-500/50 ${
                        workoutErrors.includes("name")
                          ? "border-red-500"
                          : "border-white/10"
                      }`}
                      placeholder="Nome do treino"
                      maxLength={100}
                      value={workoutName}
                      onChange={(e) => {
                        setWorkoutName(e.target.value);
                        setWorkoutErrors((c) =>
                          c.filter((err) => err !== "name"),
                        );
                      }}
                    />
                    <input
                      className={`h-10 w-full rounded-lg border bg-zinc-950 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-emerald-500/50 ${
                        workoutErrors.includes("goal")
                          ? "border-red-500"
                          : "border-white/10"
                      }`}
                      placeholder="Objetivo"
                      maxLength={100}
                      value={workoutGoal}
                      onChange={(e) => {
                        setWorkoutGoal(e.target.value);
                        setWorkoutErrors((c) =>
                          c.filter((err) => err !== "goal"),
                        );
                      }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={
                        editingWorkout
                          ? handleUpdateWorkout
                          : handleCreateWorkout
                      }
                      className="flex h-10 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-emerald-500 text-sm font-semibold text-white transition hover:bg-emerald-600"
                    >
                      <Plus size={15} />
                      {editingWorkout ? "Salvar alterações" : "Criar treino"}
                    </button>
                    {editingWorkout && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingWorkout(null);
                          setWorkoutName("");
                          setWorkoutGoal("");
                          setWorkoutErrors([]);
                        }}
                        className="h-10 cursor-pointer rounded-lg border border-white/10 px-4 text-sm font-semibold text-zinc-400 transition hover:bg-white/10"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>

                {workouts.length === 0 ? (
                  <p className="py-4 text-center text-xs text-zinc-600">
                    Nenhum treino cadastrado.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {workouts.map((w) => (
                      <div
                        key={w.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">
                            {w.name}
                          </p>
                          <p className="truncate text-xs text-zinc-500">
                            Objetivo: {w.goal}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenWorkout(w)}
                            className="flex cursor-pointer items-center gap-1 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 transition hover:bg-emerald-500/20"
                          >
                            Abrir
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingWorkout(w);
                              setWorkoutName(w.name);
                              setWorkoutGoal(w.goal);
                              setWorkoutErrors([]);
                            }}
                            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/10 hover:text-white"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              requestDelete({
                                type: "workout",
                                id: w.id,
                                name: w.name,
                              })
                            }
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
            </div>
          )}

          {/* ── VIEW: DIVISÕES ── */}
          {view === "divisions" && selectedWorkout && (
            <div className="space-y-3">
              <div className="rounded-xl border border-white/10 bg-zinc-900/70 p-4">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-white">
                      {selectedWorkout.name}{" "}
                      <span className="font-normal text-zinc-400">
                        ({selectedWorkout.goal})
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Configure as divisões do plano escolhido
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      requestDelete({
                        type: "workout",
                        id: selectedWorkout.id,
                        name: selectedWorkout.name,
                      })
                    }
                    className="flex shrink-0 cursor-pointer items-center gap-1 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/20"
                  >
                    <Trash2 size={12} />
                    Excluir treino
                  </button>
                </div>

                <div className="mb-3 space-y-2">
                  {editingDivision && (
                    <p className="text-xs font-semibold text-emerald-400">
                      Editando: {editingDivision.name}
                    </p>
                  )}
                  <input
                    className={`h-10 w-full rounded-lg border bg-zinc-950 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-emerald-500/50 ${
                      divisionError ? "border-red-500" : "border-white/10"
                    }`}
                    placeholder="Nome da divisão (ex.: Peito e Tríceps)"
                    maxLength={100}
                    value={divisionName}
                    onChange={(e) => {
                      setDivisionName(e.target.value);
                      if (divisionError) setDivisionError(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        if (editingDivision) {
                          handleUpdateDivision();
                        } else {
                          handleCreateDivision();
                        }
                      }
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={
                        editingDivision
                          ? handleUpdateDivision
                          : handleCreateDivision
                      }
                      className="flex h-10 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-emerald-500 text-sm font-semibold text-white transition hover:bg-emerald-600"
                    >
                      <Plus size={15} />
                      {editingDivision
                        ? "Salvar alterações"
                        : "Adicionar divisão"}
                    </button>
                    {editingDivision && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingDivision(null);
                          setDivisionName("");
                          setDivisionError(false);
                        }}
                        className="h-10 cursor-pointer rounded-lg border border-white/10 px-4 text-sm font-semibold text-zinc-400 transition hover:bg-white/10"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>

                {divisions.length === 0 ? (
                  <p className="py-4 text-center text-xs text-zinc-600">
                    Nenhuma divisão adicionada ainda.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {divisions.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5"
                      >
                        <p className="truncate text-sm font-medium text-white">
                          {d.name}
                        </p>
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenDivision(d)}
                            className="flex cursor-pointer items-center gap-1 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 transition hover:bg-emerald-500/20"
                          >
                            Abrir
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingDivision(d);
                              setDivisionName(d.name);
                              setDivisionError(false);
                            }}
                            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/10 hover:text-white"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              requestDelete({
                                type: "division",
                                id: d.id,
                                name: d.name,
                              })
                            }
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
            </div>
          )}

          {/* ── VIEW: EXERCÍCIOS ── */}
          {view === "exercises" && selectedWorkout && selectedDivision && (
            <div className="space-y-3">
              <div className="rounded-xl border border-white/10 bg-zinc-900/70 p-4">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-white">
                      {selectedDivision.name}
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Cadastre exercícios e observações para esta divisão
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      requestDelete({
                        type: "division",
                        id: selectedDivision.id,
                        name: selectedDivision.name,
                      })
                    }
                    className="flex shrink-0 cursor-pointer items-center gap-1 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/20"
                  >
                    <Trash2 size={12} />
                    Excluir divisão
                  </button>
                </div>

                <div className="mb-3 space-y-2">
                  <p className="text-xs font-semibold text-zinc-300">
                    {editingExercise
                      ? "Editando exercício"
                      : "Adicionar exercício"}
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                    <input
                      className={inputClass}
                      placeholder="Exercício (ex.: Supino)"
                      maxLength={100}
                      value={exForm.name}
                      onChange={(e) =>
                        setExForm({ ...exForm, name: e.target.value })
                      }
                    />
                    <input
                      className={inputClass}
                      placeholder="Músculo (ex.: Peito)"
                      maxLength={50}
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
                      placeholder="Descanso (segundos)"
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
                    maxLength={500}
                    value={exForm.notes}
                    onChange={(e) =>
                      setExForm({ ...exForm, notes: e.target.value })
                    }
                  />
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={handleSaveExercise}
                      className="flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white transition hover:bg-emerald-600"
                    >
                      <Plus size={15} />
                      {editingExercise
                        ? "Salvar alterações"
                        : "Adicionar exercício"}
                    </button>
                    <button
                      type="button"
                      onClick={resetExForm}
                      className="h-10 cursor-pointer rounded-lg border border-white/10 px-4 text-sm font-semibold text-zinc-400 transition hover:bg-white/10"
                    >
                      Limpar campos
                    </button>
                  </div>
                </div>

                {exercises.length === 0 ? (
                  <p className="py-3 text-center text-xs text-zinc-600">
                    Nenhum exercício adicionado ainda.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {exercises.map((ex) => (
                      <div
                        key={ex.id}
                        className="rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">
                              {ex.name}
                            </p>
                            <p className="mt-0.5 text-xs text-zinc-500">
                              {[
                                ex.muscle,
                                ex.sets && `${ex.sets} séries`,
                                ex.reps && `${ex.reps} reps`,
                                ex.duration && `${ex.duration}`,
                                ex.rest && `${ex.rest}s de descanso`,
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
                              onClick={() =>
                                requestDelete({
                                  type: "exercise",
                                  id: ex.id,
                                  name: ex.name,
                                })
                              }
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
            </div>
          )}
        </div>

        {/* Rodapé fixo */}
        <div className="shrink-0 border-t border-white/10 p-5 pt-4 sm:p-6 sm:pt-4">
          {view === "workouts" && (
            <button
              type="button"
              onClick={handleClose}
              className="w-full cursor-pointer rounded-full border border-white/10 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-white/10"
            >
              Fechar
            </button>
          )}

          {(view === "divisions" || view === "exercises") && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 cursor-pointer rounded-full border border-white/10 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-white/10"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={handleCopySummary}
                className="flex cursor-pointer items-center justify-center gap-1.5 rounded-full bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-700"
              >
                <Copy size={14} />
                Copiar resumo
              </button>
              <button
                type="button"
                onClick={handleSaveToClipboard}
                className="flex cursor-pointer items-center justify-center gap-1.5 rounded-full bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-400 transition hover:bg-emerald-500/20"
              >
                <Save size={14} />
                Salvar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal de confirmação de exclusão */}
      {deleteTarget && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white">
              {deleteTarget.type === "workout" && "Excluir Treino?"}
              {deleteTarget.type === "division" && "Excluir Divisão?"}
              {deleteTarget.type === "exercise" && "Excluir Exercício?"}
            </h2>

            <p className="mt-2 text-sm text-zinc-400">
              Isso excluirá{" "}
              <span className="font-semibold text-white">
                {deleteTarget.name}
              </span>
              {deleteTarget.type === "workout" &&
                " e todas as divisões e exercícios cadastrados nele"}
              {deleteTarget.type === "division" &&
                " e todos os exercícios cadastrados nela"}
              .
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              Essa ação é permanente e não pode ser desfeita.
            </p>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="flex-1 cursor-pointer rounded-full border border-white/10 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-white/10 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 cursor-pointer rounded-full bg-red-500 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
              >
                {isDeleting ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
