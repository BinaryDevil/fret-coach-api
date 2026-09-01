import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { AuthModule } from './auth/auth.module';
import { AnalysisModule } from './analysis/analysis.module';
import { ExercisesModule } from './exercises/exercises.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { PracticeSessionsModule } from './practice-sessions/practice-sessions.module';
import { PracticeAttemptsModule } from './practice-attempts/practice-attempts.module';
import { ProgressModule } from './progress/progress.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
        PORT: Joi.number().port().default(3000),
        DATABASE_URL: Joi.string().uri().required(),
        JWT_ACCESS_SECRET: Joi.string().min(32).required(),
        JWT_REFRESH_SECRET: Joi.string().min(32).required(),
        JWT_ACCESS_TTL: Joi.string().default('15m'),
        JWT_REFRESH_TTL: Joi.string().default('30d'),
        GOOGLE_CLIENT_ID: Joi.string().optional(),
      }),
    }),
    PrismaModule,
    AnalysisModule,
    HealthModule,
    AuthModule,
    UsersModule,
    ExercisesModule,
    DashboardModule,
    PracticeSessionsModule,
    PracticeAttemptsModule,
    ProgressModule,
  ],
})
export class AppModule {}
