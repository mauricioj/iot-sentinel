import { PartialType } from '@nestjs/swagger';
import { CreateThingTypeDto } from './create-thing-type.dto';

export class UpdateThingTypeDto extends PartialType(CreateThingTypeDto) {}
