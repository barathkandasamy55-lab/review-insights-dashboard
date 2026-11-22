import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { PropertiesModule } from './modules/properties/properties.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { InsightsModule } from './modules/insights/insights.module';
import { ReviewsModule } from './modules/reviews/reviews.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, PropertiesModule, DashboardModule, InsightsModule, ReviewsModule],
})
export class AppModule {}
