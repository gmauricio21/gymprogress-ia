import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Put,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { WorkoutService } from './workout.service';
import { adminAuth } from '../firebase-admin';

@Controller('workout')
export class WorkoutController {
  constructor(private readonly workoutService: WorkoutService) {}

  private async getUserId(authorization?: string) {
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }
    const token = authorization.replace('Bearer ', '');
    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken.uid;
  }

  // ─── TREINOS ───────────────────────────────────────────

  @Get()
  async getWorkouts(@Headers('authorization') authorization?: string) {
    const userId = await this.getUserId(authorization);
    return this.workoutService.getWorkouts(userId);
  }

  @Post()
  async createWorkout(
    @Body() body: { name: string; goal: string },
    @Headers('authorization') authorization?: string,
  ) {
    if (!body?.name?.trim())
      throw new BadRequestException('Nome é obrigatório.');
    if (!body?.goal?.trim())
      throw new BadRequestException('Objetivo é obrigatório.');
    const userId = await this.getUserId(authorization);
    return this.workoutService.createWorkout(userId, body.name, body.goal);
  }

  @Delete(':workoutId')
  async deleteWorkout(
    @Param('workoutId') workoutId: string,
    @Headers('authorization') authorization?: string,
  ) {
    const userId = await this.getUserId(authorization);
    return this.workoutService.deleteWorkout(userId, workoutId);
  }

  // ─── DIAS ──────────────────────────────────────────────

  @Get(':workoutId/days')
  async getDays(
    @Param('workoutId') workoutId: string,
    @Headers('authorization') authorization?: string,
  ) {
    const userId = await this.getUserId(authorization);
    return this.workoutService.getDays(userId, workoutId);
  }

  @Post(':workoutId/days')
  async createDay(
    @Param('workoutId') workoutId: string,
    @Body() body: { name: string },
    @Headers('authorization') authorization?: string,
  ) {
    if (!body?.name?.trim())
      throw new BadRequestException('Nome do dia é obrigatório.');
    const userId = await this.getUserId(authorization);
    return this.workoutService.createDay(userId, workoutId, body.name);
  }

  @Delete(':workoutId/days/:dayId')
  async deleteDay(
    @Param('workoutId') workoutId: string,
    @Param('dayId') dayId: string,
    @Headers('authorization') authorization?: string,
  ) {
    const userId = await this.getUserId(authorization);
    return this.workoutService.deleteDay(userId, workoutId, dayId);
  }

  // ─── EXERCÍCIOS ────────────────────────────────────────

  @Get(':workoutId/days/:dayId/exercises')
  async getExercises(
    @Param('workoutId') workoutId: string,
    @Param('dayId') dayId: string,
    @Headers('authorization') authorization?: string,
  ) {
    const userId = await this.getUserId(authorization);
    return this.workoutService.getExercises(userId, workoutId, dayId);
  }

  @Post(':workoutId/days/:dayId/exercises')
  async createExercise(
    @Param('workoutId') workoutId: string,
    @Param('dayId') dayId: string,
    @Body()
    body: {
      name: string;
      muscle?: string;
      load?: string;
      sets?: string;
      reps?: string;
      rest?: string;
      duration?: string;
      notes?: string;
    },
    @Headers('authorization') authorization?: string,
  ) {
    if (!body?.name?.trim())
      throw new BadRequestException('Nome do exercício é obrigatório.');
    const userId = await this.getUserId(authorization);
    return this.workoutService.createExercise(userId, workoutId, dayId, body);
  }

  @Put(':workoutId/days/:dayId/exercises/:exerciseId')
  async updateExercise(
    @Param('workoutId') workoutId: string,
    @Param('dayId') dayId: string,
    @Param('exerciseId') exerciseId: string,
    @Body()
    body: {
      name?: string;
      muscle?: string;
      load?: string;
      sets?: string;
      reps?: string;
      rest?: string;
      duration?: string;
      notes?: string;
    },
    @Headers('authorization') authorization?: string,
  ) {
    const userId = await this.getUserId(authorization);
    return this.workoutService.updateExercise(
      userId,
      workoutId,
      dayId,
      exerciseId,
      body,
    );
  }

  @Delete(':workoutId/days/:dayId/exercises/:exerciseId')
  async deleteExercise(
    @Param('workoutId') workoutId: string,
    @Param('dayId') dayId: string,
    @Param('exerciseId') exerciseId: string,
    @Headers('authorization') authorization?: string,
  ) {
    const userId = await this.getUserId(authorization);
    return this.workoutService.deleteExercise(
      userId,
      workoutId,
      dayId,
      exerciseId,
    );
  }

  // ─── RESUMO ────────────────────────────────────────────

  @Get(':workoutId/summary')
  async getWorkoutSummary(
    @Param('workoutId') workoutId: string,
    @Headers('authorization') authorization?: string,
  ) {
    const userId = await this.getUserId(authorization);
    return this.workoutService.getWorkoutSummary(userId, workoutId);
  }
}
