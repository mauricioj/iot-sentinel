import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type NetworkDocument = HydratedDocument<Network>;

@Schema({ timestamps: true })
export class Network {
  @Prop({ type: Types.ObjectId, ref: 'Local', required: true, index: true })
  localId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: Number, default: null })
  vlanId: number | null;

  @Prop({ required: true })
  cidr: string;

  @Prop({ default: '' })
  gateway: string;

  @Prop({ default: '' })
  description: string;

  createdAt: Date;
  updatedAt: Date;
}

export const NetworkSchema = SchemaFactory.createForClass(Network);
