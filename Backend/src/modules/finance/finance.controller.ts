import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { AuthUser } from '../../common/auth-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { DeleteDto } from '../../common/dto/delete.dto';
import { AddPayoutDto, CashReportQueryDto, StatementQueryDto } from './dto/finance.dto';
import { FinanceService } from './finance.service';

/**
 * The day's cash (the desk sees its own branch's; the owner every branch) and
 * the doctors' statements (a doctor sees their own; the owner records payouts).
 * The platform reads both.
 */
@Controller()
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Roles('admin', 'owner', 'receptionist')
  @Get('cash-report')
  cashReport(@Query() query: CashReportQueryDto, @CurrentUser() user: AuthUser) {
    return this.finance.cashReport(query, user);
  }

  @Roles('admin', 'owner', 'doctor')
  @Get('doctor-statement')
  statement(@Query() query: StatementQueryDto, @CurrentUser() user: AuthUser) {
    return this.finance.statement(query, user);
  }

  @Roles('owner')
  @HttpCode(HttpStatus.OK)
  @Post('doctor-payout')
  addPayout(@Body() dto: AddPayoutDto, @CurrentUser() user: AuthUser) {
    return this.finance.addPayout(dto, user);
  }

  @Roles('owner')
  @HttpCode(HttpStatus.OK)
  @Post('delete-doctor-payout')
  removePayout(@Body() dto: DeleteDto, @CurrentUser() user: AuthUser) {
    return this.finance.removePayout(dto.id, user);
  }
}
