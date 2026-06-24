import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatModule } from './chat/chat.module';
import { WorkoutModule } from './workout/workout.module';
import { AccountModule } from './account/account.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ChatModule,
    WorkoutModule,
    AccountModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
