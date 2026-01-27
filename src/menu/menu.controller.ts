import { Body, Controller, Get, Post } from '@nestjs/common';
import { MenuService } from './menu.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';

@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get()
  getMenu() {
    return this.menuService.getAll();
  }

  @Post()
  createMenuItem(@Body() dto: CreateMenuItemDto) {
    return this.menuService.upsert(dto);

  }
}



