import { Controller, Post, Body, Res, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { BackupService } from './backup.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/interfaces/user.interface';

@ApiTags('Backup')
@ApiBearerAuth()
@Controller('api/v1/backup')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Post('export')
  @ApiOperation({ summary: 'Export backup' })
  async exportBackup(@Body('password') password: string, @Res() res: Response) {
    const buffer = await this.backupService.export(password);
    const filename = `iot-sentinel-backup-${new Date().toISOString().split('T')[0]}.json.gz`;
    res.set({
      'Content-Type': 'application/gzip',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(buffer);
  }

  @Post('restore')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' }, password: { type: 'string' } } } })
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Restore from backup' })
  async restoreBackup(@UploadedFile() file: Express.Multer.File, @Body('password') password: string) {
    return this.backupService.restore(file.buffer, password);
  }
}
