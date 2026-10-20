import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { CountersModule } from './counters/counters.module';
import { LookupsModule } from './database/lookups.module';
import { SchemasModule } from './database/schemas.module';
import { AuthModule } from './modules/auth/auth.module';
import { ClinicsModule } from './modules/clinics/clinics.module';
import { DoctorsModule } from './modules/doctors/doctors.module';
import { GroupsModule } from './modules/groups/groups.module';
import { HomeModule } from './modules/home/home.module';
import { PatientsModule } from './modules/patients/patients.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { ReceptionistsModule } from './modules/receptionists/receptionists.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { ServicesModule } from './modules/services/services.module';
import { SpecialtiesModule } from './modules/specialties/specialties.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
      }),
    }),
    SchemasModule,
    LookupsModule,
    CountersModule,
    AuthModule,
    GroupsModule,
    ClinicsModule,
    DoctorsModule,
    ReceptionistsModule,
    PatientsModule,
    ReservationsModule,
    SchedulesModule,
    SpecialtiesModule,
    ProvidersModule,
    ServicesModule,
    HomeModule,
  ],
  providers: [
    // Order matters: authenticate first, then check the role.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
