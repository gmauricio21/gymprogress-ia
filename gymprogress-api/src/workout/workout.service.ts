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

  async deleteWorkout(userId: string, workoutId: string) {
    const workoutRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('workouts')
      .doc(workoutId);

    // Deleta dias e exercícios em cascata
    const daysSnap = await workoutRef.collection('days').get();

    for (const dayDoc of daysSnap.docs) {
      const exercisesSnap = await dayDoc.ref.collection('exercises').get();
      const batch = adminDb.batch();
      exercisesSnap.docs.forEach((ex) => batch.delete(ex.ref));
      batch.delete(dayDoc.ref);
      await batch.commit();
    }

    await workoutRef.delete();
    return { success: true };
  }

  // ─── DIAS ──────────────────────────────────────────────

  async getDays(userId: string, workoutId: string) {
    const snap = await adminDb
      .collection('users')
      .doc(userId)
      .collection('workouts')
      .doc(workoutId)
      .collection('days')
      .orderBy('createdAt', 'asc')
      .get();

    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async createDay(userId: string, workoutId: string, name: string) {
    const ref = adminDb
      .collection('users')
      .doc(userId)
      .collection('workouts')
      .doc(workoutId)
      .collection('days')
      .doc();

    await ref.set({
      name,
      createdAt: FieldValue.serverTimestamp(),
    });

    return { dayId: ref.id };
  }

  async deleteDay(userId: string, workoutId: string, dayId: string) {
    const dayRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('workouts')
      .doc(workoutId)
      .collection('days')
      .doc(dayId);

    const exercisesSnap = await dayRef.collection('exercises').get();
    const batch = adminDb.batch();
    exercisesSnap.docs.forEach((ex) => batch.delete(ex.ref));
    batch.delete(dayRef);
    await batch.commit();

    return { success: true };
  }

  // ─── EXERCÍCIOS ────────────────────────────────────────

  async getExercises(userId: string, workoutId: string, dayId: string) {
    const snap = await adminDb
      .collection('users')
      .doc(userId)
      .collection('workouts')
      .doc(workoutId)
      .collection('days')
      .doc(dayId)
      .collection('exercises')
      .orderBy('createdAt', 'asc')
      .get();

    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async createExercise(
    userId: string,
    workoutId: string,
    dayId: string,
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
      .collection('days')
      .doc(dayId)
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
    dayId: string,
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
      .collection('days')
      .doc(dayId)
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
    dayId: string,
    exerciseId: string,
  ) {
    await adminDb
      .collection('users')
      .doc(userId)
      .collection('workouts')
      .doc(workoutId)
      .collection('days')
      .doc(dayId)
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
    const daysSnap = await adminDb
      .collection('users')
      .doc(userId)
      .collection('workouts')
      .doc(workoutId)
      .collection('days')
      .orderBy('createdAt', 'asc')
      .get();

    let summary = `📋 *${workout.name}*\n🎯 Objetivo: ${workout.goal}\n\n`;

    for (const dayDoc of daysSnap.docs) {
      const day = dayDoc.data() as { name: string };
      summary += `📅 *${day.name}*\n`;

      const exercisesSnap = await dayDoc.ref
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
