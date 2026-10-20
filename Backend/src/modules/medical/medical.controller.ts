import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { AuthUser } from '../../common/auth-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { DeleteDto } from '../../common/dto/delete.dto';
import { ATTACHMENT_MAX_BYTES } from './attachment.schema';
import { MedicalBackgroundDto, UploadAttachmentDto } from './dto/medical.dto';
import { MedicalService, UploadedFileData } from './medical.service';

/**
 * A patient's medical file: read by the group's doctors, its owner and the
 * platform; written by the doctors and the owner. Not the front desk's.
 */
@Controller()
export class MedicalController {
  constructor(private readonly medical: MedicalService) {}

  @Roles('admin', 'owner', 'doctor')
  @Get('patient-medical/:id')
  file(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.medical.file(id, user);
  }

  @Roles('owner', 'doctor')
  @HttpCode(HttpStatus.OK)
  @Post('patient-medical')
  saveBackground(@Body() dto: MedicalBackgroundDto, @CurrentUser() user: AuthUser) {
    return this.medical.saveBackground(dto, user);
  }

  /** Multipart: `file`, plus `patient_id`, `kind`, and optionally `reservation_id` and `title`. */
  @Roles('owner', 'doctor')
  @HttpCode(HttpStatus.OK)
  @Post('patient-attachments')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: ATTACHMENT_MAX_BYTES, files: 1 } }))
  upload(@UploadedFile() file: UploadedFileData | undefined, @Body() dto: UploadAttachmentDto, @CurrentUser() user: AuthUser) {
    return this.medical.upload(file, dto, user);
  }

  /** The file itself, shown inline (the dashboard fetches it with the token and opens it). */
  @Roles('admin', 'owner', 'doctor')
  @Get('patient-attachment/:id')
  async download(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser, @Res() res: Response) {
    const { row, stream } = await this.medical.open(id, user);
    res.setHeader('Content-Type', row.content_type);
    res.setHeader('Content-Length', String(row.size));
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(row.file_name)}`);
    res.setHeader('Cache-Control', 'private, max-age=300');
    stream.once('error', () => res.status(404).end());
    stream.pipe(res);
  }

  @Roles('owner', 'doctor')
  @HttpCode(HttpStatus.OK)
  @Post('delete-patient-attachment')
  remove(@Body() dto: DeleteDto, @CurrentUser() user: AuthUser) {
    return this.medical.remove(dto.id, user);
  }
}
