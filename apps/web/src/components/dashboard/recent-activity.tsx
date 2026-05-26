'use client';

import { formatDistanceToNow, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useRecentActivity } from '@/hooks/use-admin-dashboard';

export function RecentActivity() {
  const { data: activities, isLoading } = useRecentActivity();

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))}
          </div>
        ) : !activities?.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No recent activity.
          </p>
        ) : (
          <ScrollArea className="h-[360px]">
            <div className="space-y-4">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="border-b pb-3 last:border-0"
                >
                  <p className="text-sm font-medium leading-none">
                    {activity.action}{' '}
                    <span className="text-muted-foreground">
                      on {activity.entity}
                      {activity.entityId && ` #${activity.entityId.slice(0, 8)}`}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activity.user?.email ?? 'System'} &middot;{' '}
                    {formatDistanceToNow(parseISO(activity.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
