'use client';

import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  FileText,
  Filter,
  Receipt,
  Wallet,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ListGroup,
  ListHeader,
  ListItem,
  ListItems,
  ListProvider,
} from '@/components/kibo-ui/list';
import {
  useHotelCredit,
  useHotelCreditLedger,
  useHotelInvoices,
} from '@/hooks/use-hotel-portal';
import type {
  HotelCreditLedgerEntry,
  HotelInvoice,
} from '@/lib/types/hotel-portal';
import { cn } from '@/lib/utils';

function formatMoney(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All types' },
  { value: 'DEBIT', label: 'Debit' },
  { value: 'CREDIT', label: 'Credit' },
  { value: 'REFUND', label: 'Refund' },
];

export default function HotelBillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground">
          Credit balance, transaction ledger and invoices.
        </p>
      </div>

      <CreditOverviewCard />
      <CreditLedgerSection />
      <InvoiceHistorySection />
    </div>
  );
}

// ─── Credit Overview ───────────────────────────────────────────────────────
function CreditOverviewCard() {
  const { data: credit, isLoading } = useHotelCredit();

  const creditLimit = credit?.creditLimit ?? 0;
  const creditUsed = credit?.creditUsed ?? 0;
  const creditBalance = credit?.creditBalance ?? 0;
  const usedPct =
    creditLimit > 0 ? Math.min(100, (creditUsed / creditLimit) * 100) : 0;
  const isLowCredit = creditLimit > 0 && creditBalance / creditLimit < 0.2;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Wallet className="h-4 w-4 text-indigo-600" />
          Credit overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Metric label="Credit limit" value={formatMoney(creditLimit)} />
              <Metric
                label="Credit used"
                value={formatMoney(creditUsed)}
                tone="warning"
              />
              <Metric
                label="Available balance"
                value={formatMoney(creditBalance)}
                tone={isLowCredit ? 'danger' : 'success'}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Using {formatMoney(creditUsed)} of {formatMoney(creditLimit)}
                </span>
                <span>{usedPct.toFixed(0)}%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    isLowCredit ? 'bg-red-500' : 'bg-emerald-500',
                  )}
                  style={{ width: `${usedPct}%` }}
                />
              </div>
              {isLowCredit && (
                <Badge variant="destructive" className="text-[10px]">
                  Low credit — consider topping up
                </Badge>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
}) {
  const toneClass =
    tone === 'success'
      ? 'text-emerald-600'
      : tone === 'warning'
        ? 'text-amber-600'
        : tone === 'danger'
          ? 'text-red-600'
          : 'text-foreground';
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('mt-1 text-xl font-bold tabular-nums', toneClass)}>
        {value}
      </p>
    </div>
  );
}

// ─── Credit Ledger ─────────────────────────────────────────────────────────
function CreditLedgerSection() {
  const [typeFilter, setTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filters = useMemo(
    () => ({
      type: typeFilter || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }),
    [typeFilter, startDate, endDate],
  );

  const hasFilters = !!(typeFilter || startDate || endDate);

  const { data: ledger, isLoading } = useHotelCreditLedger(filters);

  function resetFilters() {
    setTypeFilter('');
    setStartDate('');
    setEndDate('');
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Receipt className="h-4 w-4 text-primary" />
          Credit ledger
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="ledger-type">Type</Label>
            <select
              id="ledger-type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-10 w-36 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="ledger-start">From</Label>
            <Input
              id="ledger-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ledger-end">To</Label>
            <Input
              id="ledger-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-40"
            />
          </div>
          {hasFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="gap-1"
            >
              <X className="h-3 w-3" />
              Clear
            </Button>
          )}
          <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
            <Filter className="h-3 w-3" />
            {ledger?.length ?? 0} entries
          </div>
        </div>

        <LedgerListHeader />

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : !ledger || ledger.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed py-10 text-sm text-muted-foreground">
            <Receipt className="h-8 w-8 opacity-50" />
            <span>No ledger entries match these filters.</span>
          </div>
        ) : (
          <ListProvider onDragEnd={() => {}} className="gap-0">
            <ListGroup id="ledger" className="bg-transparent">
              <ListHeader>
                <div className="sr-only">Credit ledger</div>
              </ListHeader>
              <ListItems className="gap-1 p-0">
                {ledger.map((entry, index) => (
                  <LedgerRow
                    key={entry.id}
                    entry={entry}
                    index={index}
                  />
                ))}
              </ListItems>
            </ListGroup>
          </ListProvider>
        )}
      </CardContent>
    </Card>
  );
}

function LedgerListHeader() {
  return (
    <div className="grid grid-cols-[140px_100px_1fr_120px_120px] items-center gap-3 border-b px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      <span>Date</span>
      <span>Type</span>
      <span>Description</span>
      <span className="text-right">Amount</span>
      <span className="text-right">Balance</span>
    </div>
  );
}

function LedgerRow({
  entry,
  index,
}: {
  entry: HotelCreditLedgerEntry;
  index: number;
}) {
  const type = entry.type.toUpperCase();
  const isDebit = type === 'DEBIT';
  const isCredit = type === 'CREDIT' || type === 'REFUND';

  const toneClass = isDebit
    ? 'border-l-red-500 bg-red-500/5'
    : isCredit
      ? 'border-l-emerald-500 bg-emerald-500/5'
      : 'border-l-muted-foreground bg-muted/20';

  const badgeClass = isDebit
    ? 'border-red-500/40 bg-red-500/10 text-red-700'
    : isCredit
      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700'
      : 'border-muted-foreground/40 bg-muted text-muted-foreground';

  const amountClass = isDebit
    ? 'text-red-600'
    : isCredit
      ? 'text-emerald-600'
      : 'text-foreground';
  const amountPrefix = isDebit ? '−' : isCredit ? '+' : '';
  const Icon = isDebit ? ArrowUpRight : ArrowDownLeft;

  return (
    <ListItem
      id={entry.id}
      name={entry.description}
      index={index}
      parent="ledger"
      className={cn(
        'grid cursor-default grid-cols-[140px_100px_1fr_120px_120px] items-center gap-3 rounded-none border-y-0 border-l-4 border-r-0 px-3 py-3 text-sm shadow-none',
        toneClass,
      )}
    >
      <span className="font-mono text-xs text-muted-foreground">
        {format(parseISO(entry.createdAt), 'dd MMM yyyy HH:mm')}
      </span>
      <Badge variant="outline" className={cn('h-5 gap-1 text-[10px]', badgeClass)}>
        <Icon className="h-3 w-3" />
        {type}
      </Badge>
      <span className="line-clamp-1 text-sm">{entry.description}</span>
      <span className={cn('text-right font-semibold tabular-nums', amountClass)}>
        {amountPrefix}
        {formatMoney(entry.amount)}
      </span>
      <span className="text-right text-sm tabular-nums text-muted-foreground">
        {formatMoney(entry.balance)}
      </span>
    </ListItem>
  );
}

// ─── Invoice History ───────────────────────────────────────────────────────
function InvoiceHistorySection() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filters = useMemo(
    () => ({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }),
    [startDate, endDate],
  );

  const hasFilters = !!(startDate || endDate);

  const { data: invoices, isLoading } = useHotelInvoices(filters);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4 text-primary" />
          Invoice history
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="inv-start">From</Label>
            <Input
              id="inv-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="inv-end">To</Label>
            <Input
              id="inv-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-40"
            />
          </div>
          {hasFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="gap-1"
            >
              <X className="h-3 w-3" />
              Clear
            </Button>
          )}
          <div className="ml-auto text-xs text-muted-foreground">
            {invoices?.length ?? 0} invoices
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : !invoices || invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed py-10 text-sm text-muted-foreground">
            <FileText className="h-8 w-8 opacity-50" />
            <span>No invoices for this period.</span>
          </div>
        ) : (
          <div className="divide-y rounded-md border">
            {invoices.map((invoice) => (
              <InvoiceRow key={invoice.id} invoice={invoice} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InvoiceRow({ invoice }: { invoice: HotelInvoice }) {
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <FileText className="h-4 w-4" />
        </div>
        <div className="space-y-0.5">
          <p className="text-sm font-medium">
            #{invoice.invoiceNumber}
          </p>
          <p className="text-xs text-muted-foreground">
            {invoice.appointment.patient.firstName}{' '}
            {invoice.appointment.patient.lastName} ·{' '}
            {invoice.appointment.appointmentType.replaceAll('_', ' ')} ·{' '}
            {format(parseISO(invoice.createdAt), 'dd MMM yyyy')}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold tabular-nums">
          {formatMoney(invoice.amount, invoice.currency)}
        </span>
        {invoice.pdfUrl ? (
          <a
            href={invoice.pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center gap-1 rounded-md border bg-background px-3 text-xs font-medium hover:bg-muted"
          >
            <Download className="h-3 w-3" />
            PDF
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">PDF pending</span>
        )}
      </div>
    </div>
  );
}
