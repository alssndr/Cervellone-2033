import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { CalendarIcon, MapPinIcon, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const sportLabels: Record<string, string> = {
  THREE: '3v3',
  FIVE: '5v5',
  EIGHT: '8v8',
  ELEVEN: '11v11',
};

const statusLabels: Record<string, string> = {
  STARTER: 'Titolare',
  RESERVE: 'Riserva',
  NEXT: 'Prossima volta',
};

interface UserMatchDetailProps {
  params: {
    id: string;
  };
}

export default function UserMatchDetail({ params }: UserMatchDetailProps) {
  const matchId = params.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['/api/user/matches'],
  });

  const match = data?.matches?.find((m: any) => m.id === matchId);

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const response = await apiRequest('PATCH', `/api/user/matches/${matchId}/status`, {
        status: newStatus,
      });
      if (!response.ok) {
        throw new Error('Failed to update status');
      }
      return response.json();
    },
    onSuccess: async () => {
      toast({
        title: 'Stato aggiornato',
        description: 'Il tuo stato è stato aggiornato con successo',
      });
      // Force refetch to bypass cache
      await queryClient.invalidateQueries({ queryKey: ['/api/user/matches'] });
      await queryClient.refetchQueries({ queryKey: ['/api/user/matches'] });
    },
    onError: () => {
      toast({
        title: 'Errore',
        description: 'Impossibile aggiornare lo stato',
        variant: 'destructive',
      });
    },
  });

  function handleStatusChange(newStatus: string) {
    setSelectedStatus(newStatus);
    updateStatusMutation.mutate(newStatus);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <p className="text-inkMuted">Caricamento...</p>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Partita non trovata</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation('/user/matches')} variant="outline">
              Torna alle mie partite
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStatus = selectedStatus || match.myStatus;

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-3xl mx-auto p-4 py-8">
        <Button
          variant="ghost"
          onClick={() => setLocation('/user/matches')}
          className="mb-6"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Torna alle mie partite
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4 mb-4">
              <Badge variant="outline" data-testid="badge-sport">
                {sportLabels[match.sport] || match.sport}
              </Badge>
            </div>
            <CardTitle className="text-2xl" data-testid="text-match-title">
              {match.location || 'Partita'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col gap-3 text-sm text-inkMuted">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                <span data-testid="text-match-date">
                  {format(new Date(match.dateTime), "d MMMM yyyy 'alle' HH:mm", { locale: it })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPinIcon className="w-4 h-4" />
                <span data-testid="text-match-location">
                  {match.location}
                </span>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-ink mb-4">
                Il tuo stato
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Select
                      value={currentStatus}
                      onValueChange={handleStatusChange}
                      disabled={updateStatusMutation.isPending}
                    >
                      <SelectTrigger data-testid="select-status">
                        <SelectValue placeholder="Seleziona stato" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="STARTER" data-testid="option-starter">
                          Titolare
                        </SelectItem>
                        <SelectItem value="RESERVE" data-testid="option-reserve">
                          Riserva
                        </SelectItem>
                        <SelectItem value="NEXT" data-testid="option-next">
                          Prossima volta
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Badge variant="secondary" data-testid="badge-current-status">
                    {statusLabels[currentStatus]}
                  </Badge>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-xs text-blue-900">
                    <strong>Titolare:</strong> Giocherai nella partita come titolare<br />
                    <strong>Riserva:</strong> Sei in lista come riserva, potresti giocare se un titolare si ritira<br />
                    <strong>Prossima volta:</strong> Non giocherai in questa partita
                  </p>
                </div>

                {match.myStatus === 'STARTER' && currentStatus !== 'STARTER' && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <p className="text-xs text-orange-900">
                      ⚠️ Se ti togli da titolare, la prima riserva in lista prenderà il tuo posto automaticamente
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t pt-6">
              <Button
                variant="outline"
                onClick={() => setLocation(`/matches/${matchId}`)}
                className="w-full"
                data-testid="button-view-public"
              >
                Visualizza composizione squadre
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
