'use client';

import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Pencil } from 'lucide-react';
import type { DoctorDetail } from '@/lib/types/doctor';

interface DoctorProfileCardProps {
  doctor: DoctorDetail;
  onEdit: () => void;
}

export function DoctorProfileCard({ doctor, onEdit }: DoctorProfileCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>
          Dr. {doctor.firstName} {doctor.lastName}
        </CardTitle>
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="text-sm font-medium">{doctor.user.email}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Phone</p>
            <p className="text-sm font-medium">{doctor.user.phone || '—'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Specialization</p>
            <p className="text-sm font-medium">
              {doctor.specialization || '—'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">License Number</p>
            <p className="text-sm font-medium">{doctor.licenseNumber}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">WhatsApp</p>
            <p className="text-sm font-medium">
              {doctor.whatsappNumber || '—'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge variant={doctor.user.isActive ? 'default' : 'secondary'}>
              {doctor.user.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>
        <div>
          <p className="text-sm text-muted-foreground mb-2">
            Availability Types
          </p>
          <div className="flex gap-2">
            {doctor.isAvailableHouseCall && (
              <Badge variant="outline">House Call</Badge>
            )}
            {doctor.isAvailableTeleConsult && (
              <Badge variant="outline">Tele-Consultation</Badge>
            )}
            {doctor.isAvailableMedicalVisit && (
              <Badge variant="outline">Medical Visit</Badge>
            )}
            {!doctor.isAvailableHouseCall &&
              !doctor.isAvailableTeleConsult &&
              !doctor.isAvailableMedicalVisit && (
                <span className="text-sm text-muted-foreground">None set</span>
              )}
          </div>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Member since</p>
          <p className="text-sm font-medium">
            {format(parseISO(doctor.createdAt), 'MMM d, yyyy')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
