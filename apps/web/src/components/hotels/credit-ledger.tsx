'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  ListProvider,
  ListGroup,
  ListHeader,
  ListItems,
  ListItem,
  type DragEndEvent,
} from '@/components/kibo-ui/list';
import { useCreditLedger } from '@/hooks/use-hotels';

const typeConfig: Record<string, { label: string; color: string }> = {
  CREDIT_ADDED: { label: 'Credit Added', color: '#22c55e' },
  CREDIT_USED: { label: 'Credit Used', color: '#ef4444' },
  CREDIT_REFUNDED: { label: 'Refunded', color: '#3b82f6' },
};

export function CreditLedger({ hotelId }: { hotelId: string }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useCreditLedger(hotelId, page);

  // No-op drag handler — ledger is read-only
  function handleDragEnd(_event: DragEndEvent) {
    // intentionally empty
  }

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Loading credit ledger...
      </p>
    );
  }

  if (!data?.entries.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Credit Ledger</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No credit transactions yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalPages = Math.ceil(data.total / data.limit);

  // Group entries by type
  const grouped = data.entries.reduce<Record<string, typeof data.entries>>(
    (acc, entry) => {
      const key = entry.type;
      if (!acc[key]) acc[key] = [];
      acc[key].push(entry);
      return acc;
    },
    {},
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Credit Ledger</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ListProvider onDragEnd={handleDragEnd}>
          {Object.entries(grouped).map(([type, entries]) => {
            const config = typeConfig[type] || {
              label: type.replace(/_/g, ' '),
              color: '#6b7280',
            };
            return (
              <ListGroup key={type} id={type} className="rounded-lg mb-3">
                <ListHeader name={config.label} color={config.color} />
                <ListItems>
                  {entries.map((entry, index) => (
                    <ListItem
                      key={entry.id}
                      id={entry.id}
                      name={entry.description}
                      index={index}
                      parent={type}
                    >
                      <div className="flex w-full items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {entry.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(entry.createdAt), 'MMM d, yyyy HH:mm')}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p
                            className={`text-sm font-semibold ${
                              entry.type === 'CREDIT_USED'
                                ? 'text-destructive'
                                : 'text-green-600'
                            }`}
                          >
                            {entry.type === 'CREDIT_USED' ? '-' : '+'}$
                            {Math.abs(parseFloat(entry.amount)).toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Bal: ${parseFloat(entry.balance).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </ListItem>
                  ))}
                </ListItems>
              </ListGroup>
            );
          })}
        </ListProvider>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({data.total} total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
