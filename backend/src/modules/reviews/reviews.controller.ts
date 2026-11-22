import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { parsePropertyIds } from '../../common/filters.dto';
import { ReviewsService } from './reviews.service';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly service: ReviewsService) {}

  @Get()
  @ApiOperation({ summary: 'Paginated review feed with filters' })
  @ApiQuery({ name: 'sentiment', required: false, enum: ['positive', 'neutral', 'negative'] })
  @ApiQuery({ name: 'sort', required: false, enum: ['newest', 'lowest', 'highest'] })
  list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('propertyIds') propertyIds?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('sentiment') sentiment?: string,
    @Query('topic') topic?: string,
    @Query('q') q?: string,
    @Query('sort') sort?: string,
  ) {
    return this.service.list({ page, pageSize, propertyIds: parsePropertyIds(propertyIds), from, to, sentiment, topic, q, sort });
  }
}
