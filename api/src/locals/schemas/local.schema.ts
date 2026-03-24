import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type LocalDocument = HydratedDocument<Local>;

@Schema({ timestamps: true })
export class Local {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ default: '' })
  address: string;

  createdAt: Date;
  updatedAt: Date;
}

export const LocalSchema = SchemaFactory.createForClass(Local);
