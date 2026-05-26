import { PrismaClient, Role, AppointmentType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

async function hash(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function main() {
  console.log('🌱 Seeding database...\n');

  // ─── ADMIN ──────────────────────────────────────────────────────────────────

  const adminPassword = await hash('Admin@123');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@medilink.lk' },
    update: {},
    create: {
      email: 'admin@medilink.lk',
      phone: '+94770000001',
      passwordHash: adminPassword,
      role: Role.ADMIN,
      staff: {
        create: {
          firstName: 'System',
          lastName: 'Admin',
          department: 'Administration',
        },
      },
    },
  });
  console.log(`✓ Admin: admin@medilink.lk / Admin@123 (${admin.id})`);

  // ─── SYSTEM USER (for service-context operations like WhatsApp bookings) ───

  const systemPassword = await hash('System@Internal!');
  const systemUser = await prisma.user.upsert({
    where: { email: 'system@medilink.lk' },
    update: {},
    create: {
      email: 'system@medilink.lk',
      passwordHash: systemPassword,
      role: Role.ADMIN,
      staff: {
        create: {
          firstName: 'System',
          lastName: 'Service',
          department: 'Internal',
        },
      },
    },
  });
  console.log(`✓ System: system@medilink.lk (${systemUser.id})`);

  // ─── CALL CENTER ────────────────────────────────────────────────────────────

  const supportPassword = await hash('Support@123');
  const callCenter = await prisma.user.upsert({
    where: { email: 'support@medilink.lk' },
    update: {},
    create: {
      email: 'support@medilink.lk',
      phone: '+94770000002',
      passwordHash: supportPassword,
      role: Role.CALL_CENTER,
      staff: {
        create: {
          firstName: 'Support',
          lastName: 'Agent',
          department: 'Call Center',
        },
      },
    },
  });
  console.log(
    `✓ Call Center: support@medilink.lk / Support@123 (${callCenter.id})`,
  );

  // ─── DOCTORS ────────────────────────────────────────────────────────────────

  const doctorsData = [
    {
      email: 'dr.silva@medilink.lk',
      phone: '+94771000001',
      password: 'Doctor@123',
      firstName: 'Nimal',
      lastName: 'Silva',
      specialization: 'General Practice',
      licenseNumber: 'SLMC-GP-2024-001',
      whatsappNumber: '+94771000001',
    },
    {
      email: 'dr.perera@medilink.lk',
      phone: '+94771000002',
      password: 'Doctor@123',
      firstName: 'Kumari',
      lastName: 'Perera',
      specialization: 'Pediatrics',
      licenseNumber: 'SLMC-PD-2024-002',
      whatsappNumber: '+94771000002',
    },
    {
      email: 'dr.fernando@medilink.lk',
      phone: '+94771000003',
      password: 'Doctor@123',
      firstName: 'Ashan',
      lastName: 'Fernando',
      specialization: 'Emergency Medicine',
      licenseNumber: 'SLMC-EM-2024-003',
      whatsappNumber: '+94771000003',
    },
  ];

  const doctors = [];
  for (const d of doctorsData) {
    const passwordHash = await hash(d.password);
    const user = await prisma.user.upsert({
      where: { email: d.email },
      update: {},
      create: {
        email: d.email,
        phone: d.phone,
        passwordHash,
        role: Role.DOCTOR,
        doctor: {
          create: {
            firstName: d.firstName,
            lastName: d.lastName,
            specialization: d.specialization,
            licenseNumber: d.licenseNumber,
            whatsappNumber: d.whatsappNumber,
            isAvailableHouseCall: true,
            isAvailableTeleConsult: true,
            isAvailableMedicalVisit: true,
          },
        },
      },
      include: { doctor: true },
    });
    doctors.push(user);
    console.log(
      `✓ Doctor: ${d.email} / ${d.password} — ${d.specialization} (${user.doctor!.id})`,
    );
  }

  // ─── DOCTOR AVAILABILITY (Mon-Fri, 8am-5pm, Tele-Consultation) ─────────────

  for (const doc of doctors) {
    const doctorId = doc.doctor!.id;
    // Clear existing availability so re-seeding is idempotent
    await prisma.doctorAvailability.deleteMany({ where: { doctorId } });
    for (let day = 1; day <= 5; day++) {
      await prisma.doctorAvailability.create({
        data: {
          doctorId,
          dayOfWeek: day,
          startTime: '08:00',
          endTime: '17:00',
          appointmentType: AppointmentType.TELE_CONSULTATION,
          isActive: true,
        },
      });
    }
  }
  console.log(`✓ Doctor availability: Mon-Fri 08:00-17:00 (3 doctors × 5 days)`);

  // ─── HOTELS ─────────────────────────────────────────────────────────────────

  const hotelsData = [
    {
      email: 'hotel.kandy@medilink.lk',
      phone: '+94812000001',
      password: 'Hotel@123',
      name: 'Grand Kandy Hotel',
      address: '123 Temple Street, Kandy, Sri Lanka',
      contactPerson: 'Ruwan Jayawardena',
      hotelPhone: '+94812345678',
      hotelEmail: 'info@grandkandy.lk',
      latitude: 7.2906,
      longitude: 80.6337,
      creditLimit: 5000,
    },
    {
      email: 'hotel.colombo@medilink.lk',
      phone: '+94112000001',
      password: 'Hotel@123',
      name: 'Colombo Beach Resort',
      address: '456 Galle Road, Colombo 3, Sri Lanka',
      contactPerson: 'Dilani Wickramasinghe',
      hotelPhone: '+94112345678',
      hotelEmail: 'info@colombobeach.lk',
      latitude: 6.9271,
      longitude: 79.8612,
      creditLimit: 3000,
    },
    {
      email: 'hotel.galle@medilink.lk',
      phone: '+94912000001',
      password: 'Hotel@123',
      name: 'Galle Fort Hotel',
      address: '789 Church Street, Galle Fort, Sri Lanka',
      contactPerson: 'Pradeep Ratnayake',
      hotelPhone: '+94912345678',
      hotelEmail: 'info@gallefort.lk',
      latitude: 6.0294,
      longitude: 80.2170,
      creditLimit: 2000,
    },
  ];

  const hotels = [];
  for (const h of hotelsData) {
    const passwordHash = await hash(h.password);
    const user = await prisma.user.upsert({
      where: { email: h.email },
      update: {},
      create: {
        email: h.email,
        phone: h.phone,
        passwordHash,
        role: Role.HOTEL,
        hotel: {
          create: {
            name: h.name,
            address: h.address,
            contactPerson: h.contactPerson,
            phone: h.hotelPhone,
            email: h.hotelEmail,
            latitude: h.latitude,
            longitude: h.longitude,
            creditLimit: h.creditLimit,
            creditUsed: 0,
          },
        },
      },
      include: { hotel: true },
    });
    hotels.push(user);
    console.log(
      `✓ Hotel: ${h.name} — $${h.creditLimit} credit (${user.hotel!.id})`,
    );
  }

  // ─── QR CODES (2 per hotel) ─────────────────────────────────────────────────

  const qrLocations = ['Lobby', 'Reception'];
  for (const hotel of hotels) {
    const hotelId = hotel.hotel!.id;
    const hotelName = hotel.hotel!.name;
    for (const location of qrLocations) {
      const code = `ML-${hotelName.replace(/\s+/g, '-').toUpperCase().slice(0, 10)}-${location.toUpperCase().slice(0, 3)}`;
      await prisma.qRCode.upsert({
        where: { code },
        update: {},
        create: {
          hotelId,
          code,
          location,
          isActive: true,
          scanCount: 0,
        },
      });
    }
  }
  console.log(`✓ QR Codes: 6 total (2 per hotel — Lobby, Reception)`);

  // ─── PATIENTS ───────────────────────────────────────────────────────────────

  const patientsData = [
    {
      email: 'john.smith@gmail.com',
      phone: '+447700100001',
      password: 'Patient@123',
      firstName: 'John',
      lastName: 'Smith',
      nationality: 'British',
      passportNumber: 'GB1234567',
      whatsappNumber: '+447700100001',
      hotelIndex: 0,
    },
    {
      email: 'emma.mueller@gmail.com',
      phone: '+491701000002',
      password: 'Patient@123',
      firstName: 'Emma',
      lastName: 'Mueller',
      nationality: 'German',
      passportNumber: 'DE9876543',
      whatsappNumber: '+491701000002',
      hotelIndex: 1,
    },
    {
      email: 'yuki.tanaka@gmail.com',
      phone: '+819012000003',
      password: 'Patient@123',
      firstName: 'Yuki',
      lastName: 'Tanaka',
      nationality: 'Japanese',
      passportNumber: 'JP5678901',
      whatsappNumber: '+819012000003',
      hotelIndex: 2,
    },
  ];

  for (const p of patientsData) {
    const passwordHash = await hash(p.password);
    const user = await prisma.user.upsert({
      where: { email: p.email },
      update: {},
      create: {
        email: p.email,
        phone: p.phone,
        passwordHash,
        role: Role.PATIENT,
        patient: {
          create: {
            firstName: p.firstName,
            lastName: p.lastName,
            dateOfBirth: new Date('1990-01-15'),
            nationality: p.nationality,
            passportNumber: p.passportNumber,
            whatsappNumber: p.whatsappNumber,
            emailAddress: p.email,
            hotelId: hotels[p.hotelIndex].hotel!.id,
          },
        },
      },
    });
    console.log(
      `✓ Patient: ${p.firstName} ${p.lastName} — ${p.email} / ${p.password} (${user.id})`,
    );
  }

  // ─── APPOINTMENT PRICING ────────────────────────────────────────────────────

  const pricingData = [
    { type: AppointmentType.HOUSE_CALL, price: 150 },
    { type: AppointmentType.TELE_CONSULTATION, price: 75 },
    { type: AppointmentType.MEDICAL_VISIT, price: 100 },
  ];

  for (const p of pricingData) {
    const existing = await prisma.appointmentPricing.findFirst({
      where: { appointmentType: p.type, isActive: true },
    });
    if (!existing) {
      await prisma.appointmentPricing.create({
        data: {
          appointmentType: p.type,
          price: p.price,
          currency: 'USD',
          isActive: true,
          effectiveFrom: new Date('2024-01-01'),
        },
      });
    }
  }
  console.log(
    `✓ Pricing: House Call $150, Tele-Consultation $75, Medical Visit $100`,
  );

  // ─── SYSTEM CONFIG ──────────────────────────────────────────────────────────

  const configData = [
    {
      key: 'teleconsult_slot_duration_minutes',
      value: '30',
      description: 'Duration of each tele-consultation slot in minutes',
    },
    {
      key: 'teleconsult_payment_timeout_minutes',
      value: '60',
      description:
        'Minutes before unpaid appointment is auto-cancelled',
    },
    {
      key: 'default_currency',
      value: 'USD',
      description: 'Default currency for payments',
    },
    {
      key: 'max_reschedules',
      value: '3',
      description: 'Maximum number of reschedules per appointment',
    },
    {
      key: 'reschedule_notice_hours',
      value: '2',
      description: 'Minimum hours before appointment to allow rescheduling',
    },
  ];

  for (const c of configData) {
    await prisma.systemConfig.upsert({
      where: { key: c.key },
      update: {},
      create: c,
    });
  }
  console.log(`✓ System config: ${configData.length} entries`);

  // ─── DRUGS ──────────────────────────────────────────────────────────────────

  const drugsData = [
    {
      name: 'Paracetamol',
      genericName: 'Acetaminophen',
      category: 'Analgesic',
      manufacturer: 'GSK',
      dosageForm: 'Tablet',
      strength: '500mg',
    },
    {
      name: 'Amoxicillin',
      genericName: 'Amoxicillin',
      category: 'Antibiotic',
      manufacturer: 'Pfizer',
      dosageForm: 'Capsule',
      strength: '500mg',
    },
    {
      name: 'Ibuprofen',
      genericName: 'Ibuprofen',
      category: 'NSAID',
      manufacturer: 'Boots',
      dosageForm: 'Tablet',
      strength: '400mg',
    },
    {
      name: 'Omeprazole',
      genericName: 'Omeprazole',
      category: 'Proton Pump Inhibitor',
      manufacturer: 'AstraZeneca',
      dosageForm: 'Capsule',
      strength: '20mg',
    },
    {
      name: 'Cetirizine',
      genericName: 'Cetirizine Hydrochloride',
      category: 'Antihistamine',
      manufacturer: 'UCB',
      dosageForm: 'Tablet',
      strength: '10mg',
    },
    {
      name: 'Metformin',
      genericName: 'Metformin Hydrochloride',
      category: 'Antidiabetic',
      manufacturer: 'Merck',
      dosageForm: 'Tablet',
      strength: '500mg',
    },
    {
      name: 'Azithromycin',
      genericName: 'Azithromycin',
      category: 'Antibiotic',
      manufacturer: 'Pfizer',
      dosageForm: 'Tablet',
      strength: '250mg',
    },
    {
      name: 'Diclofenac',
      genericName: 'Diclofenac Sodium',
      category: 'NSAID',
      manufacturer: 'Novartis',
      dosageForm: 'Tablet',
      strength: '50mg',
    },
    {
      name: 'Loratadine',
      genericName: 'Loratadine',
      category: 'Antihistamine',
      manufacturer: 'Bayer',
      dosageForm: 'Tablet',
      strength: '10mg',
    },
    {
      name: 'Ranitidine',
      genericName: 'Ranitidine Hydrochloride',
      category: 'H2 Blocker',
      manufacturer: 'Sanofi',
      dosageForm: 'Tablet',
      strength: '150mg',
    },
  ];

  for (const d of drugsData) {
    const exists = await prisma.drug.findFirst({ where: { name: d.name } });
    if (!exists) {
      await prisma.drug.create({ data: { ...d, isActive: true } });
    }
  }
  console.log(`✓ Drugs: ${drugsData.length} entries`);

  // ─── SUMMARY ────────────────────────────────────────────────────────────────

  console.log('\n🎉 Seed complete!\n');
  console.log('Login credentials:');
  console.log('  Admin:       admin@medilink.lk / Admin@123');
  console.log('  Call Center: support@medilink.lk / Support@123');
  console.log('  Doctors:     dr.silva@medilink.lk / Doctor@123');
  console.log('               dr.perera@medilink.lk / Doctor@123');
  console.log('               dr.fernando@medilink.lk / Doctor@123');
  console.log('  Hotels:      hotel.kandy@medilink.lk / Hotel@123');
  console.log('               hotel.colombo@medilink.lk / Hotel@123');
  console.log('               hotel.galle@medilink.lk / Hotel@123');
  console.log('  Patients:    john.smith@gmail.com / Patient@123');
  console.log('               emma.mueller@gmail.com / Patient@123');
  console.log('               yuki.tanaka@gmail.com / Patient@123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
