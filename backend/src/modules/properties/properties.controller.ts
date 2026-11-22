import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PropertiesService } from './properties.service';

@ApiTags('Properties')
@Controller()
export class PropertiesController {
  constructor(private readonly service: PropertiesService) {}

  @Get('properties')
  @ApiOperation({ summary: 'The four properties with headline stats' })
  list() {
    return this.service.list();
  }

  @Get('data-status')
  @ApiOperation({ summary: 'When each property was last collected and whether the run succeeded' })
  status() {
    return this.service.scrapeStatus();
  }
}
