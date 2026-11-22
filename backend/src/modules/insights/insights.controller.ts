import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { parsePropertyIds } from '../../common/filters.dto';
import { InsightsService } from './insights.service';

@ApiTags('Insights')
@Controller('insights')
export class InsightsController {
  constructor(private readonly service: InsightsService) {}

  @Get('topics')
  @ApiOperation({ summary: 'Complaint and praise share per operational topic, with plain-English headlines' })
  topics(@Query('from') from?: string, @Query('to') to?: string, @Query('propertyIds') propertyIds?: string) {
    return this.service.topics(from, to, parsePropertyIds(propertyIds));
  }
}
