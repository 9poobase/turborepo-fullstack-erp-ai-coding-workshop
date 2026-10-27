import { Module } from '@nestjs/common';
import { StockReportsController } from './stock-reports.controller.js';
import { StockController } from './stock.controller.js';

@Module({ controllers: [StockController, StockReportsController] })
export class StockModule {}
