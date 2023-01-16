import { Controller, Get, Param } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/:CP/:idComb')
  async getGasolineras(@Param('CP') CP, @Param('idComb') idComb): Promise<any> {
    return await this.appService.getGasolineras(CP, idComb);
  }
}
