export interface Drug {
  id: string;
  name: string;
  genericName: string | null;
  category: string | null;
  manufacturer: string | null;
  dosageForm: string | null;
  strength: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const DRUG_CATEGORIES = [
  'Analgesic',
  'Antibiotic',
  'Antihistamine',
  'Antihypertensive',
  'Antipyretic',
  'Antacid',
  'Vitamin',
  'Supplement',
  'Cardiovascular',
  'Diabetic',
  'Respiratory',
  'Dermatological',
  'Other',
] as const;

export const DOSAGE_FORMS = [
  'Tablet',
  'Capsule',
  'Syrup',
  'Injection',
  'Cream',
  'Ointment',
  'Drops',
  'Inhaler',
  'Suppository',
  'Patch',
  'Powder',
  'Other',
] as const;
