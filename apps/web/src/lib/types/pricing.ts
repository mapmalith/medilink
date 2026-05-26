export interface Pricing {
  id: string;
  appointmentType: 'HOUSE_CALL' | 'TELE_CONSULTATION' | 'MEDICAL_VISIT';
  price: string;
  currency: string;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdAt: string;
  updatedAt: string;
}
