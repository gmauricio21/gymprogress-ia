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

/**
 * Controlador responsável pelo gerenciamento das fichas de treino.
 *
 * Disponibiliza endpoints para:
 * - criar, listar, editar e excluir treinos;
 * - criar, listar, editar e excluir divisões;
 * - criar, listar, editar e excluir exercícios;
 * - gerar o resumo da ficha de treino.
 */
@Controller('workout')
export class WorkoutController {
  constructor(private readonly workoutService: WorkoutService) {}

  /**
   * Obtém o ID do usuário autenticado a partir do token JWT
   * enviado no cabeçalho Authorization.
   */
  private async getUserId(authorization?: string) {
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }
    const token = authorization.replace('Bearer ', '');
    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken.uid;
  }

  // ─── TREINOS ───────────────────────────────────────────
  /**
   * Lista todas as fichas de treino do usuário autenticado.
   */
  @Get()
  async getWorkouts(@Headers('authorization') authorization?: string) {
    const userId = await this.getUserId(authorization);
    return this.workoutService.getWorkouts(userId);
  }

  /**
   * Cria uma nova ficha de treino.
   *
   * Valida se o nome e o objetivo foram informados antes
   * de enviar os dados para o service.
   */
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

  /**
   * Atualiza o nome e o objetivo de uma ficha de treino existente.
   */
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

  /**
   * Exclui uma ficha de treino pelo seu identificador.
   */
  @Delete(':workoutId')
  async deleteWorkout(
    @Param('workoutId') workoutId: string,
    @Headers('authorization') authorization?: string,
  ) {
    const userId = await this.getUserId(authorization);
    return this.workoutService.deleteWorkout(userId, workoutId);
  }

  // ─── DIVISÕES ──────────────────────────────────────────
  /**
   * Lista as divisões de uma ficha de treino.
   */
  @Get(':workoutId/divisions')
  async getDivisions(
    @Param('workoutId') workoutId: string,
    @Headers('authorization') authorization?: string,
  ) {
    const userId = await this.getUserId(authorization);
    return this.workoutService.getDivisions(userId, workoutId);
  }

  /**
   * Cria uma nova divisão dentro de uma ficha de treino.
   */
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

  /**
   * Atualiza o nome de uma divisão existente.
   */
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

  /**
   * Exclui uma divisão de uma ficha de treino.
   */
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
  /**
   * Lista os exercícios de uma divisão específica.
   */
  @Get(':workoutId/divisions/:divisionId/exercises')
  async getExercises(
    @Param('workoutId') workoutId: string,
    @Param('divisionId') divisionId: string,
    @Headers('authorization') authorization?: string,
  ) {
    const userId = await this.getUserId(authorization);
    return this.workoutService.getExercises(userId, workoutId, divisionId);
  }

  /**
   * Cria um novo exercício dentro de uma divisão.
   *
   * O nome do exercício é obrigatório; os demais campos são opcionais.
   */
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

  /**
   * Atualiza os dados de um exercício existente.
   */
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

  /**
   * Exclui um exercício de uma divisão.
   */
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
  /**
   * Retorna um resumo textual da ficha de treino.
   *
   * Esse resumo pode ser utilizado para visualização rápida
   * ou cópia da ficha pelo usuário.
   */
  @Get(':workoutId/summary')
  async getWorkoutSummary(
    @Param('workoutId') workoutId: string,
    @Headers('authorization') authorization?: string,
  ) {
    const userId = await this.getUserId(authorization);
    return this.workoutService.getWorkoutSummary(userId, workoutId);
  }
}
