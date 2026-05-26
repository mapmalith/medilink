'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Link as LinkIcon,
  Loader2,
  MessageCircle,
  Send,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  useWhatsAppHealth,
  useWhatsAppLogs,
  useTestSend,
  useSetWhatsAppMode,
} from '@/hooks/use-whatsapp-admin';

export default function WhatsAppAdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">WhatsApp</h1>
        <p className="text-sm text-muted-foreground">
          Manage WhatsApp integration, view message logs, and send test
          messages.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <HealthCard />
        <TestSendCard />
      </div>

      <LogsCard />
    </div>
  );
}

function HealthCard() {
  const { data, isLoading } = useWhatsAppHealth();
  const setMode = useSetWhatsAppMode();

  const isMock = data?.mode === 'mock';

  async function handleToggle(checked: boolean) {
    try {
      await setMode.mutateAsync({ mock: !checked });
      toast.success(checked ? 'Switched to LIVE mode' : 'Switched to MOCK mode');
    } catch {
      toast.error('Failed to change mode');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircle className="h-5 w-5" />
          Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Mode</span>
              <Badge variant={isMock ? 'secondary' : 'default'}>
                {isMock ? 'MOCK (console)' : 'LIVE (Twilio)'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Sandbox number
              </span>
              <span className="font-mono text-sm">
                {data?.sandboxNumber ?? '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Ready</span>
              {data?.ready ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive" />
              )}
            </div>
            <div className="flex items-center justify-between border-t pt-3">
              <Label htmlFor="mode-toggle" className="text-sm">
                Live mode
              </Label>
              <Switch
                id="mode-toggle"
                checked={!isMock}
                onCheckedChange={handleToggle}
                disabled={setMode.isPending}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function TestSendCard() {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const sendMutation = useTestSend();

  async function handleSend() {
    if (!phone || !message) {
      toast.error('Phone number and message are required');
      return;
    }
    try {
      await sendMutation.mutateAsync({ phone, message });
      toast.success('Message sent');
      setMessage('');
    } catch {
      toast.error('Failed to send message');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Send className="h-5 w-5" />
          Test Send
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="test-phone">Phone (E.164)</Label>
          <Input
            id="test-phone"
            placeholder="+94771234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="test-message">Message</Label>
          <Textarea
            id="test-message"
            placeholder="Hello from MEDI LINK!"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        <Button
          onClick={handleSend}
          disabled={sendMutation.isPending}
          className="w-full"
        >
          {sendMutation.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Send
        </Button>
      </CardContent>
    </Card>
  );
}

function LogsCard() {
  const { data: logs, isLoading } = useWhatsAppLogs();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Messages</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : !logs || logs.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No messages yet.
          </p>
        ) : (
          <div className="max-h-[500px] divide-y overflow-y-auto">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 py-2 text-sm"
              >
                {log.direction === 'in' ? (
                  <ArrowDown className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                ) : (
                  <ArrowUp className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {log.phone}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {format(parseISO(log.createdAt), 'HH:mm:ss')}
                    </span>
                    {log.state && (
                      <Badge variant="outline" className="text-[10px]">
                        {log.state}
                      </Badge>
                    )}
                    {log.appointmentId && (
                      <Link
                        href={`/dashboard/appointments/${log.appointmentId}`}
                        className="inline-flex items-center gap-1 rounded border border-primary/30 bg-primary/5 px-1.5 py-0.5 text-[10px] font-mono text-primary hover:bg-primary/10"
                      >
                        <LinkIcon className="h-2.5 w-2.5" />
                        {log.appointmentId.slice(0, 8).toUpperCase()}
                      </Link>
                    )}
                  </div>
                  <p className="mt-0.5 break-words text-muted-foreground">
                    {log.body.slice(0, 200)}
                    {log.body.length > 200 && '…'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
