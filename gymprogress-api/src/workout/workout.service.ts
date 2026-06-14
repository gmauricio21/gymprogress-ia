import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '../firebase-admin';

@Injectable()
export class WorkoutService {
  // ─── TREINOS ───────────────────────────────────────────

  async getWorkouts(userId: string) {
    const snap = await adminDb
      .collection('users')
      .doc(userId)
      .collection('workouts')
      .orderBy('createdAt', 'desc')
      .get();

    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async createWorkout(userId: string, name: string, goal: string) {
    const ref = adminDb
      .collection('users')
      .doc(userId)
      .collection('workouts')
      .doc();

    await ref.set({
      name,
      goal,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { workoutId: ref.id };
  }

  async updateWorkout(
    userId: string,
    workoutId: string,
    name: string,
    goal: string,
  ) {
    const ref = adminDb
      .collection('users')
      .doc(userId)
      .collection('workouts')
      .doc(workoutId);

    await ref.set(
      { name, goal, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );

    return { success: true };
  }

  async deleteWorkout(userId: string, workoutId: string) {
    const workoutRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('workouts')
      .doc(workoutId);

    const divisionsSnap = await workoutRef.collection('divisions').get();

    for (const divisionDoc of divisionsSnap.docs) {
      const exercisesSnap = await divisionDoc.ref.collection('exercises').get();
      const batch = adminDb.batch();
      exercisesSnap.docs.forEach((ex) => batch.delete(ex.ref));
      batch.delete(divisionDoc.ref);
      await batch.commit();
    }

    await workoutRef.delete();
    return { success: true };
  }

  // ─── DIVISÕES ──────────────────────────────────────────

  async getDivisions(userId: string, workoutId: string) {
    const snap = await adminDb
      .collection('users')
      .doc(userId)
      .collection('workouts')
      .doc(workoutId)
      .collection('divisions')
      .orderBy('createdAt', 'asc')
      .get();

    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async createDivision(userId: string, workoutId: string, name: string) {
    const ref = adminDb
      .collection('users')
      .doc(userId)
      .collection('workouts')
      .doc(workoutId)
      .collection('divisions')
      .doc();

    await ref.set({
      name,
      createdAt: FieldValue.serverTimestamp(),
    });

    return { divisionId: ref.id };
  }

  async updateDivision(
    userId: string,
    workoutId: string,
    divisionId: string,
    name: string,
  ) {
    const ref = adminDb
      .collection('users')
      .doc(userId)
      .collection('workouts')
      .doc(workoutId)
      .collection('divisions')
      .doc(divisionId);

    await ref.set(
      { name, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );

    return { success: true };
  }

  async deleteDivision(userId: string, workoutId: string, divisionId: string) {
    const divisionRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('workouts')
      .doc(workoutId)
      .collection('divisions')
      .doc(divisionId);

    const exercisesSnap = await divisionRef.collection('exercises').get();
    const batch = adminDb.batch();
    exercisesSnap.docs.forEach((ex) => batch.delete(ex.ref));
    batch.delete(divisionRef);
    await batch.commit();

    return { success: true };
  }

  // ─── EXERCÍCIOS ────────────────────────────────────────

  async getExercises(userId: string, workoutId: string, divisionId: string) {
    const snap = await adminDb
      .collection('users')
      .doc(userId)
      .collection('workouts')
      .doc(workoutId)
      .collection('divisions')
      .doc(divisionId)
      .collection('exercises')
      .orderBy('createdAt', 'asc')
      .get();

    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async createExercise(
    userId: string,
    workoutId: string,
    divisionId: string,
    data: {
      name: string;
      muscle?: string;
      load?: string;
      sets?: string;
      reps?: string;
      rest?: string;
      duration?: string;
      notes?: string;
    },
  ) {
    const ref = adminDb
      .collection('users')
      .doc(userId)
      .collection('workouts')
      .doc(workoutId)
      .collection('divisions')
      .doc(divisionId)
      .collection('exercises')
      .doc();

    await ref.set({
      ...data,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { exerciseId: ref.id };
  }

  async updateExercise(
    userId: string,
    workoutId: string,
    divisionId: string,
    exerciseId: string,
    data: {
      name?: string;
      muscle?: string;
      load?: string;
      sets?: string;
      reps?: string;
      rest?: string;
      duration?: string;
      notes?: string;
    },
  ) {
    const ref = adminDb
      .collection('users')
      .doc(userId)
      .collection('workouts')
      .doc(workoutId)
      .collection('divisions')
      .doc(divisionId)
      .collection('exercises')
      .doc(exerciseId);

    await ref.set(
      { ...data, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );

    return { success: true };
  }

  async deleteExercise(
    userId: string,
    workoutId: string,
    divisionId: string,
    exerciseId: string,
  ) {
    await adminDb
      .collection('users')
      .doc(userId)
      .collection('workouts')
      .doc(workoutId)
      .collection('divisions')
      .doc(divisionId)
      .collection('exercises')
      .doc(exerciseId)
      .delete();

    return { success: true };
  }

  // ─── RESUMO ────────────────────────────────────────────

  async getWorkoutSummary(userId: string, workoutId: string) {
    const workoutSnap = await adminDb
      .collection('users')
      .doc(userId)
      .collection('workouts')
      .doc(workoutId)
      .get();

    if (!workoutSnap.exists) {
      throw new HttpException('Treino não encontrado.', HttpStatus.NOT_FOUND);
    }

    const workout = workoutSnap.data() as { name: string; goal: string };
    const divisionsSnap = await adminDb
      .collection('users')
      .doc(userId)
      .collection('workouts')
      .doc(workoutId)
      .collection('divisions')
      .orderBy('createdAt', 'asc')
      .get();

    let summary = `📋 *${workout.name}*\n🎯 Objetivo: ${workout.goal}\n\n`;

    for (const divisionDoc of divisionsSnap.docs) {
      const division = divisionDoc.data() as { name: string };
      summary += `💪 *${division.name}*\n`;

      const exercisesSnap = await divisionDoc.ref
        .collection('exercises')
        .orderBy('createdAt', 'asc')
        .get();

      for (const exDoc of exercisesSnap.docs) {
        const ex = exDoc.data() as {
          name: string;
          muscle?: string;
          load?: string;
          sets?: string;
          reps?: string;
          rest?: string;
          duration?: string;
          notes?: string;
        };

        summary += `• ${ex.name}`;
        if (ex.muscle) summary += ` | ${ex.muscle}`;
        if (ex.sets) summary += ` | ${ex.sets} séries`;
        if (ex.reps) summary += ` x ${ex.reps} reps`;
        if (ex.load) summary += ` | ${ex.load}kg`;
        if (ex.rest) summary += ` | descanso: ${ex.rest}s`;
        if (ex.notes) summary += `\n  📝 ${ex.notes}`;
        summary += '\n';
      }

      summary += '\n';
    }

    return { summary };
  }
}
