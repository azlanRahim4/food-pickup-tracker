import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class MenuItem {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  availableQty: number;
}

export const MenuItemSchema = SchemaFactory.createForClass(MenuItem);
