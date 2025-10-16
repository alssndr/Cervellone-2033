import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { AXIS_LABELS_IT, type AxisKey, AXES } from '@shared/schema';
import { UserCircle, CheckCircle, Edit } from 'lucide-react';

interface PlayerWithRatings {
  id: string;
  name: string;
  surname: string;
  phone: string;
  currentRatings: any;
  suggestedRatings: any;
  hasSuggestion: boolean;
}

export default function AdminPlayers() {
  const { toast } = useToast();
  const [editingPlayer, setEditingPlayer] = useState<PlayerWithRatings | null>(null);
  const [editedRatings, setEditedRatings] = useState<Record<string, number>>({});

  const { data, isLoading } = useQuery<{ ok: boolean; players: PlayerWithRatings[] }>({
    queryKey: ['/api/admin/players'],
  });

  const approveMutation = useMutation({
    mutationFn: async ({ playerId, ratings }: { playerId: string; ratings: any }) => {
      const response = await apiRequest('POST', `/api/admin/players/${playerId}/approve-ratings`, { ratings });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/players'] });
      toast({
        title: 'Rating approvati',
        description: 'I rating sono stati aggiornati con successo',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile approvare i rating',
        variant: 'destructive',
      });
    },
  });

  const updateRatingsMutation = useMutation({
    mutationFn: async ({ playerId, ratings }: { playerId: string; ratings: any }) => {
      const response = await apiRequest('POST', `/api/admin/players/${playerId}/approve-ratings`, { ratings });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/players'] });
      setEditingPlayer(null);
      toast({
        title: 'Rating aggiornati',
        description: 'I rating sono stati modificati con successo',
      });
    },
  });

  const openEditDialog = (player: PlayerWithRatings) => {
    setEditingPlayer(player);
    const ratings: Record<string, number> = {};
    AXES.forEach(axis => {
      ratings[axis] = player.currentRatings?.[axis] || 3;
    });
    setEditedRatings(ratings);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-paper p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blueTeam mb-4"></div>
              <p className="text-inkMuted">Caricamento giocatori...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const players = data?.players || [];
  const playersWithSuggestions = players.filter(p => p.hasSuggestion);
  const regularPlayers = players.filter(p => !p.hasSuggestion);

  return (
    <div className="min-h-screen bg-paper p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-ink mb-2">Gestione Giocatori</h1>
          <p className="text-inkMuted">
            Totale: {players.length} giocatori • {playersWithSuggestions.length} con rating suggeriti
          </p>
        </div>

        {/* Players with suggested ratings */}
        {playersWithSuggestions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-ink">Da Approvare</h2>
            <div className="grid gap-4">
              {playersWithSuggestions.map((player) => (
                <Card key={player.id} data-testid={`card-player-${player.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <UserCircle className="w-8 h-8 text-inkMuted" />
                        <div>
                          <CardTitle className="text-lg">
                            {player.name} {player.surname}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">{player.phone}</p>
                        </div>
                      </div>
                      <Badge variant="secondary">Richiede approvazione</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Current Ratings */}
                      <div>
                        <h4 className="text-sm font-semibold mb-3 text-inkMuted">Rating Attuali</h4>
                        <div className="space-y-2">
                          {AXES.map((axis) => (
                            <div key={axis} className="flex justify-between items-center">
                              <span className="text-sm">{AXIS_LABELS_IT[axis as AxisKey]}</span>
                              <span className="text-sm font-semibold">
                                {player.currentRatings?.[axis] || '-'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Suggested Ratings */}
                      <div>
                        <h4 className="text-sm font-semibold mb-3 text-blueTeam">Rating Suggeriti</h4>
                        <div className="space-y-2">
                          {AXES.map((axis) => (
                            <div key={axis} className="flex justify-between items-center">
                              <span className="text-sm">{AXIS_LABELS_IT[axis as AxisKey]}</span>
                              <span className="text-sm font-semibold text-blueTeam">
                                {player.suggestedRatings?.[axis] || '-'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t">
                      <Button
                        onClick={() => approveMutation.mutate({ 
                          playerId: player.id, 
                          ratings: player.suggestedRatings 
                        })}
                        disabled={approveMutation.isPending}
                        data-testid={`button-approve-${player.id}`}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {approveMutation.isPending ? 'Approvazione...' : 'Approva Rating Suggeriti'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Regular players */}
        <div>
          <h2 className="text-xl font-semibold mb-4 text-ink">Tutti i Giocatori</h2>
          <div className="grid gap-4">
            {regularPlayers.map((player) => (
              <Card key={player.id} data-testid={`card-player-${player.id}`}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <UserCircle className="w-8 h-8 text-inkMuted" />
                    <div>
                      <CardTitle className="text-lg">
                        {player.name} {player.surname}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">{player.phone}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <h4 className="text-sm font-semibold mb-3 text-inkMuted">Rating</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {AXES.map((axis) => (
                      <div key={axis} className="flex justify-between items-center">
                        <span className="text-sm">{AXIS_LABELS_IT[axis as AxisKey]}</span>
                        <span className="text-sm font-semibold">
                          {player.currentRatings?.[axis] || '-'}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => openEditDialog(player)}
                      data-testid={`button-edit-${player.id}`}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Modifica Rating
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Edit Ratings Dialog */}
      <Dialog open={!!editingPlayer} onOpenChange={(open) => !open && setEditingPlayer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Modifica Rating - {editingPlayer?.name} {editingPlayer?.surname}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {AXES.map((axis) => (
              <div key={axis} className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor={`rating-${axis}`}>{AXIS_LABELS_IT[axis as AxisKey]}</Label>
                  <span className="text-sm font-semibold">{editedRatings[axis] || 3}</span>
                </div>
                <Slider
                  id={`rating-${axis}`}
                  min={1}
                  max={5}
                  step={1}
                  value={[editedRatings[axis] || 3]}
                  onValueChange={(value) => setEditedRatings({ ...editedRatings, [axis]: value[0] })}
                  data-testid={`slider-edit-${axis}`}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingPlayer(null)}
              data-testid="button-cancel-edit"
            >
              Annulla
            </Button>
            <Button
              onClick={() => editingPlayer && updateRatingsMutation.mutate({ 
                playerId: editingPlayer.id, 
                ratings: editedRatings 
              })}
              disabled={updateRatingsMutation.isPending}
              data-testid="button-save-ratings"
            >
              {updateRatingsMutation.isPending ? 'Salvataggio...' : 'Salva Modifiche'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
