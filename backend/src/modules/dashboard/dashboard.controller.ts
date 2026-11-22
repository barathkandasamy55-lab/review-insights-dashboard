import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { parsePropertyIds } from '../../common/filters.dto';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Average rating for a period vs the previous period, overall and per property' })
  @ApiQuery({ name: 'period', required: false, enum: ['week', 'last7', 'last30', 'last90', 'custom'] })
  summary(
    @Query('period') period?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('propertyIds') propertyIds?: string,
  ) {
    return this.service.summary(period, from, to, parsePropertyIds(propertyIds));
  }

  @Get('trends')
  @ApiOperation({ summary: 'Positive / neutral / negative review counts over time' })
  @ApiQuery({ name: 'bucket', required: false, enum: ['day', 'week', 'month'] })
  trends(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('propertyIds') propertyIds?: string,
    @Query('bucket') bucket?: 'day' | 'week' | 'month',
  ) {
    return this.service.trends(from, to, parsePropertyIds(propertyIds), bucket ?? 'week');
  }
}
