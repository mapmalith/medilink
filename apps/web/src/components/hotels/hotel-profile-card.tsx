'use client';

import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pencil } from 'lucide-react';
import type { HotelDetail } from '@/lib/types/hotel';

interface HotelProfileCardProps {
  hotel: HotelDetail;
  onEdit: () => void;
}

export function HotelProfileCard({ hotel, onEdit }: HotelProfileCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{hotel.name}</CardTitle>
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="text-sm font-medium">{hotel.user.email}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Phone</p>
            <p className="text-sm font-medium">{hotel.phone || '—'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Contact Person</p>
            <p className="text-sm font-medium">
              {hotel.contactPerson || '—'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Address</p>
            <p className="text-sm font-medium">{hotel.address || '—'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge variant={hotel.user.isActive ? 'default' : 'secondary'}>
              {hotel.user.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Member since</p>
            <p className="text-sm font-medium">
              {format(parseISO(hotel.createdAt), 'MMM d, yyyy')}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
