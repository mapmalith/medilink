'use client';

import { useState } from 'react';
import {
  Building2,
  Check,
  MapPin,
  Phone,
  Search,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BookingWizard,
  type BookingWizardContext,
} from '@/components/booking/booking-wizard';
import {
  useHotelSearch,
  type HotelSearchResult,
} from '@/hooks/use-hotel-search';
import { cn } from '@/lib/utils';

type CallerType = 'hotel' | 'patient';

export default function CallCenterBookPage() {
  const [callerType, setCallerType] = useState<CallerType | null>(null);
  const [selectedHotel, setSelectedHotel] = useState<HotelSearchResult | null>(
    null,
  );
  const [step0Done, setStep0Done] = useState(false);

  // Once Step 0 is completed, show the shared wizard.
  if (step0Done) {
    const context: BookingWizardContext = {
      defaultAddress:
        callerType === 'hotel' && selectedHotel?.address
          ? selectedHotel.address
          : '',
      credit: null, // call-center staff generate payment links; no credit UI
      hotelId: callerType === 'hotel' ? selectedHotel?.id : undefined,
      bookedBy: callerType === 'hotel' ? 'HOTEL' : 'PATIENT',
      appointmentsHref: '/call-center/board',
      header: {
        dashboardLabel: 'Dashboard',
        dashboardHref: '/call-center',
        title: 'New Booking',
        subtitle:
          callerType === 'hotel' && selectedHotel
            ? `Booking on behalf of ${selectedHotel.name}`
            : 'Direct patient booking',
      },
    };
    return <BookingWizard context={context} />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Booking</h1>
        <p className="text-sm text-muted-foreground">
          Is the caller from a hotel or a patient booking directly?
        </p>
      </div>

      {/* Caller-type toggle */}
      <div className="grid gap-3 sm:grid-cols-2">
        <CallerTypeCard
          icon={<Building2 className="h-5 w-5 text-indigo-600" />}
          title="Hotel / Agent"
          description="Booking on behalf of a hotel guest"
          active={callerType === 'hotel'}
          onClick={() => {
            setCallerType('hotel');
            setSelectedHotel(null);
          }}
        />
        <CallerTypeCard
          icon={<User className="h-5 w-5 text-emerald-600" />}
          title="Direct Patient"
          description="Patient calling in directly"
          active={callerType === 'patient'}
          onClick={() => {
            setCallerType('patient');
            setSelectedHotel(null);
          }}
        />
      </div>

      {/* Hotel search (only when hotel branch) */}
      {callerType === 'hotel' && (
        <HotelSearchPanel
          selected={selectedHotel}
          onSelect={setSelectedHotel}
        />
      )}

      {/* Continue button */}
      <div className="flex justify-end">
        <Button
          onClick={() => setStep0Done(true)}
          disabled={
            !callerType || (callerType === 'hotel' && !selectedHotel)
          }
        >
          Continue to booking
        </Button>
      </div>
    </div>
  );
}

function CallerTypeCard({
  icon,
  title,
  description,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-start gap-2 rounded-md border p-4 text-left transition-all hover:border-primary/60',
        active && 'border-primary bg-primary/5 ring-2 ring-primary/20',
      )}
    >
      {icon}
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}

function HotelSearchPanel({
  selected,
  onSelect,
}: {
  selected: HotelSearchResult | null;
  onSelect: (h: HotelSearchResult) => void;
}) {
  const [query, setQuery] = useState('');
  const { data: results, isLoading } = useHotelSearch(query);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Select Hotel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search hotel by name or address…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="max-h-60 divide-y overflow-y-auto rounded-md border">
          {isLoading ? (
            <div className="space-y-2 p-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !results || results.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              {query.trim()
                ? 'No hotels found.'
                : 'Start typing to search hotels.'}
            </div>
          ) : (
            results.map((hotel) => {
              const isSelected = selected?.id === hotel.id;
              return (
                <button
                  key={hotel.id}
                  type="button"
                  onClick={() => onSelect(hotel)}
                  className={cn(
                    'flex w-full items-start justify-between gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/50',
                    isSelected && 'bg-primary/5',
                  )}
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{hotel.name}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {hotel.address && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {hotel.address}
                        </span>
                      )}
                      {hotel.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {hotel.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-primary" />}
                </button>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
