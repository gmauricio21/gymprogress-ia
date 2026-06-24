import {
  Controller,
  Delete,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { AccountService } from './account.service';
import { adminAuth } from '../firebase-admin';

@Controller('account')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  private async getUserId(authorization?: string) {
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    const token = authorization.replace('Bearer ', '');
    const decodedToken = await adminAuth.verifyIdToken(token);

    return decodedToken.uid;
  }

  @Delete()
  async deleteAccount(@Headers('authorization') authorization?: string) {
    const userId = await this.getUserId(authorization);
    return this.accountService.deleteAccount(userId);
  }
}
