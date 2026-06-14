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

  @Put(':workoutId')
  async updateWorkout(
    @Param('workoutId') workoutId: string,
    @Body() body: { name: string; goal: string },
    @Headers('authorization') authorization?: string,
  ) {
    if (!body?.name?.trim())
      throw new BadRequestException('Nome é obrigatório.');
    if (!body?.goal?.trim())
      throw new BadRequestException('Objetivo é obrigatório.');
    const userId = await this.getUserId(authorization);
    return this.workoutService.updateWorkout(
      userId,
      workoutId,
      body.name,
      body.goal,
    );
  }

  @Delete(':workoutId')
  async deleteWorkout(
    @Param('workoutId') workoutId: string,
    @Headers('authorization') authorization?: string,
  ) {
    const userId = await this.getUserId(authorization);
    return this.workoutService.deleteWorkout(userId, workoutId);
  }

  // ─── DIVISÕES ──────────────────────────────────────────

  @Get(':workoutId/divisions')
  async getDivisions(
    @Param('workoutId') workoutId: string,
    @Headers('authorization') authorization?: string,
  ) {
    const userId = await this.getUserId(authorization);
    return this.workoutService.getDivisions(userId, workoutId);
  }

  @Post(':workoutId/divisions')
  async createDivision(
    @Param('workoutId') workoutId: string,
    @Body() body: { name: string },
    @Headers('authorization') authorization?: string,
  ) {
    if (!body?.name?.trim())
      throw new BadRequestException('Nome da divisão é obrigatório.');
    const userId = await this.getUserId(authorization);
    return this.workoutService.createDivision(userId, workoutId, body.name);
  }

  @Put(':workoutId/divisions/:divisionId')
  async updateDivision(
    @Param('workoutId') workoutId: string,
    @Param('divisionId') divisionId: string,
    @Body() body: { name: string },
    @Headers('authorization') authorization?: string,
  ) {
    if (!body?.name?.trim())
      throw new BadRequestException('Nome da divisão é obrigatório.');
    const userId = await this.getUserId(authorization);
    return this.workoutService.updateDivision(
      userId,
      workoutId,
      divisionId,
      body.name,
    );
  }

  @Delete(':workoutId/divisions/:divisionId')
  async deleteDivision(
    @Param('workoutId') workoutId: string,
    @Param('divisionId') divisionId: string,
    @Headers('authorization') authorization?: string,
  ) {
    const userId = await this.getUserId(authorization);
    return this.workoutService.deleteDivision(userId, workoutId, divisionId);
  }

  // ─── EXERCÍCIOS ────────────────────────────────────────

  @Get(':workoutId/divisions/:divisionId/exercises')
  async getExercises(
    @Param('workoutId') workoutId: string,
    @Param('divisionId') divisionId: string,
    @Headers('authorization') authorization?: string,
  ) {
    const userId = await this.getUserId(authorization);
    return this.workoutService.getExercises(userId, workoutId, divisionId);
  }

  @Post(':workoutId/divisions/:divisionId/exercises')
  async createExercise(
    @Param('workoutId') workoutId: string,
    @Param('divisionId') divisionId: string,
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
    return this.workoutService.createExercise(
      userId,
      workoutId,
      divisionId,
      body,
    );
  }

  @Put(':workoutId/divisions/:divisionId/exercises/:exerciseId')
  async updateExercise(
    @Param('workoutId') workoutId: string,
    @Param('divisionId') divisionId: string,
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
      divisionId,
      exerciseId,
      body,
    );
  }

  @Delete(':workoutId/divisions/:divisionId/exercises/:exerciseId')
  async deleteExercise(
    @Param('workoutId') workoutId: string,
    @Param('divisionId') divisionId: string,
    @Param('exerciseId') exerciseId: string,
    @Headers('authorization') authorization?: string,
  ) {
    const userId = await this.getUserId(authorization);
    return this.workoutService.deleteExercise(
      userId,
      workoutId,
      divisionId,
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
