import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ErrorLogDocument = HydratedDocument<ErrorLog>;

@Schema({ timestamps: true })
export class ErrorLog {
  @Prop({ required: true })
  message: string;

  @Prop()
  context?: string;

  @Prop()
  stack?: string;

  @Prop()
  device?: string;

  @Prop()
  platform?: string;

  @Prop()
  timestamp?: string;
}

export const ErrorLogSchema = SchemaFactory.createForClass(ErrorLog);
