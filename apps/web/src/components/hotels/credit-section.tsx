'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { DollarSign, Plus } from 'lucide-react';
import { useTopUpCredit } from '@/hooks/use-hotels';

const topUpSchema = z.object({
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  description: z.string().optional(),
});

type TopUpForm = z.infer<typeof topUpSchema>;

interface CreditSectionProps {
  hotelId: string;
  creditLimit: string;
  creditUsed: string;
}

export function CreditSection({
  hotelId,
  creditLimit,
  creditUsed,
}: CreditSectionProps) {
  const [topUpOpen, setTopUpOpen] = useState(false);
  const topUpMutation = useTopUpCredit();

  const limit = parseFloat(creditLimit);
  const used = parseFloat(creditUsed);
  const available = limit - used;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TopUpForm>({
    resolver: zodResolver(topUpSchema),
  });

  async function onSubmit(data: TopUpForm) {
    try {
      await topUpMutation.mutateAsync({
        id: hotelId,
        amount: data.amount,
        description: data.description || undefined,
      });
      toast.success('Credit topped up successfully');
      setTopUpOpen(false);
      reset();
    } catch {
      toast.error('Failed to top up credit');
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Credit Overview
          </CardTitle>
          <Button size="sm" onClick={() => setTopUpOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Top Up
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border p-4 text-center">
              <p className="text-sm text-muted-foreground">Credit Limit</p>
              <p className="text-2xl font-bold">${limit.toFixed(2)}</p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-sm text-muted-foreground">Used</p>
              <p className="text-2xl font-bold">${used.toFixed(2)}</p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-sm text-muted-foreground">Available</p>
              <p
                className={`text-2xl font-bold ${available < 0 ? 'text-destructive' : 'text-green-600'}`}
              >
                ${available.toFixed(2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={topUpOpen} onOpenChange={setTopUpOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Top Up Credit</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register('amount')}
              />
              {errors.amount && (
                <p className="text-sm text-destructive">
                  {errors.amount.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                placeholder="e.g. Monthly top-up"
                {...register('description')}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setTopUpOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Processing...' : 'Top Up'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
