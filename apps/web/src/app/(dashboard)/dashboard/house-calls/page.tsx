'use client';

import { HouseCallKanban } from '@/components/house-calls/house-call-kanban';

export default function HouseCallsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">House Call Queue</h1>
        <p className="text-sm text-muted-foreground">
          Track in-room visits from payment through completion. Drag cards to
          update status.
        </p>
      </div>

      <HouseCallKanban />
    </div>
  );
}
