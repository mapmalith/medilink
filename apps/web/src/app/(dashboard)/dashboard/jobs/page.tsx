'use client';

import { format } from 'date-fns';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  type FailedJob,
  type JobsQueueName,
  type QueueStats,
  useFailedJobs,
  useJobStats,
  useRetryJob,
} from '@/hooks/use-jobs';

const QUEUE_LABEL: Record<JobsQueueName, string> = {
  'payment-timeout': 'Payment Timeout',
  'appointment-reminder': 'Reminders (2hr)',
  'video-room-creation': 'Video Rooms',
  'slot-generation': 'Slot Generation',
  'invoice-generation': 'Invoices',
};

export default function JobsPage() {
  const stats = useJobStats();
  const failed = useFailedJobs();
  const retry = useRetryJob();

  async function handleRetry(job: FailedJob) {
    try {
      await retry.mutateAsync({ queue: job.queue, id: job.id });
      toast.success(`Retrying ${job.name}`);
    } catch {
      toast.error('Failed to retry job');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Background Jobs</h1>
        <p className="text-sm text-muted-foreground">
          BullMQ queue health. Refreshes every 30 seconds.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))
          : (stats.data ?? []).map((q) => (
              <QueueCard key={q.name} queue={q} />
            ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Failed Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          {failed.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (failed.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No failed jobs.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Queue</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Failed At</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(failed.data ?? []).map((job) => (
                  <TableRow key={`${job.queue}:${job.id}`}>
                    <TableCell>
                      <Badge variant="outline">
                        {QUEUE_LABEL[job.queue] ?? job.queue}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {job.name}
                    </TableCell>
                    <TableCell className="max-w-[24rem] truncate text-xs text-destructive">
                      {job.failedReason}
                    </TableCell>
                    <TableCell>{job.attemptsMade}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {job.failedAt
                        ? format(new Date(job.failedAt), 'dd MMM HH:mm:ss')
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRetry(job)}
                        disabled={retry.isPending}
                      >
                        <RefreshCw className="mr-1 h-3 w-3" />
                        Retry
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function QueueCard({ queue }: { queue: QueueStats }) {
  const { counts, available } = queue;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          {QUEUE_LABEL[queue.name] ?? queue.name}
          {available ? (
            <Badge variant="outline">Online</Badge>
          ) : (
            <Badge variant="destructive">Offline</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-5 gap-2 text-center text-xs">
          <Stat label="Active" value={counts.active} />
          <Stat label="Waiting" value={counts.waiting} />
          <Stat label="Delayed" value={counts.delayed} />
          <Stat label="Done" value={counts.completed} />
          <Stat
            label="Failed"
            value={counts.failed}
            tone={counts.failed > 0 ? 'danger' : undefined}
          />
        </dl>
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'danger';
}) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={
          tone === 'danger'
            ? 'text-lg font-semibold text-destructive'
            : 'text-lg font-semibold'
        }
      >
        {value}
      </dd>
    </div>
  );
}
