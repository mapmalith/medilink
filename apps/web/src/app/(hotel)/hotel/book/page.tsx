'use client';

import {
  BookingWizard,
  type BookingWizardContext,
} from '@/components/booking/booking-wizard';
import { useHotelMe } from '@/hooks/use-hotel-portal';

export default function HotelBookPage() {
  const { data: me } = useHotelMe();

  const context: BookingWizardContext = {
    defaultAddress: me?.address ?? '',
    credit:
      me != null
        ? { limit: me.creditLimit, used: me.creditUsed }
        : null,
    appointmentsHref: '/hotel/appointments',
    header: {
      dashboardLabel: 'Dashboard',
      dashboardHref: '/hotel',
      title: 'New Appointment',
      subtitle: 'Book a consultation on behalf of a hotel guest.',
    },
  };

  return <BookingWizard context={context} />;
}
