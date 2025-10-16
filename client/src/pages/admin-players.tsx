import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { AXIS_LABELS_IT, type AxisKey, AXES } from '@shared/schema';
import { UserCircle, CheckCircle, Edit, UserPlus } from 'lucide-react';

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
  const [addingToMatch, setAddingToMatch] = useState<PlayerWithRatings | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('STARTER');
  const [creatingPlayer, setCreatingPlayer] = useState(false);
  const [newPlayerData, setNewPlayerData] = useState({
    name: '',
    surname: '',
    phone: '',
    ratings: {
      defense: 3,
      attack: 3,
      speed: 3,
      power: 3,
      technique: 3,
      shot: 3,
    },
  });

  const { data, isLoading } = useQuery<{ ok: boolean; players: PlayerWithRatings[] }>({
    queryKey: ['/api/admin/players'],
  });

  const { data: matchesData } = useQuery<{ ok: boolean; items: any[] }>({
    queryKey: ['/api/admin/matches'],
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

  const addToMatchMutation = useMutation({
    mutationFn: async ({ playerId, matchId, status }: { playerId: string; matchId: string; status: string }) => {
      const response = await apiRequest('POST', `/api/admin/players/${playerId}/add-to-match`, { matchId, status });
      return await response.json();
    },
    onSuccess: () => {
      setAddingToMatch(null);
      setSelectedMatch('');
      setSelectedStatus('STARTER');
      toast({
        title: 'Giocatore aggiunto',
        description: 'Il giocatore è stato iscritto alla partita',
      });
    },
  });

  const createPlayerMutation = useMutation({
    mutationFn: async (data: typeof newPlayerData) => {
      const response = await apiRequest('POST', '/api/admin/players', data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/players'] });
      setCreatingPlayer(false);
      setNewPlayerData({
        name: '',
        surname: '',
        phone: '',
        ratings: { defense: 3, attack: 3, speed: 3, power: 3, technique: 3, shot: 3 },
      });
      toast({
        title: 'Giocatore creato',
        description: 'Il nuovo giocatore è stato aggiunto con successo',
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
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-ink mb-2">Gestione Giocatori</h1>
            <p className="text-inkMuted">
              Totale: {players.length} giocatori • {playersWithSuggestions.length} con rating suggeriti
            </p>
          </div>
          <Button onClick={() => setCreatingPlayer(true)} data-testid="button-create-player">
            <UserPlus className="w-4 h-4 mr-2" />
            Crea Giocatore
          </Button>
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
                  <div className="mt-4 pt-4 border-t flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => openEditDialog(player)}
                      data-testid={`button-edit-${player.id}`}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Modifica Rating
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setAddingToMatch(player)}
                      data-testid={`button-add-to-match-${player.id}`}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Aggiungi a Partita
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Create Player Dialog */}
      <Dialog open={creatingPlayer} onOpenChange={(open) => !open && setCreatingPlayer(false)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crea Nuovo Giocatore</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-name">Nome *</Label>
                <Input
                  id="new-name"
                  value={newPlayerData.name}
                  onChange={(e) => setNewPlayerData({ ...newPlayerData, name: e.target.value })}
                  data-testid="input-new-name"
                  placeholder="Mario"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-surname">Cognome *</Label>
                <Input
                  id="new-surname"
                  value={newPlayerData.surname}
                  onChange={(e) => setNewPlayerData({ ...newPlayerData, surname: e.target.value })}
                  data-testid="input-new-surname"
                  placeholder="Rossi"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-phone">Telefono (opzionale)</Label>
              <Input
                id="new-phone"
                type="tel"
                value={newPlayerData.phone}
                onChange={(e) => setNewPlayerData({ ...newPlayerData, phone: e.target.value })}
                data-testid="input-new-phone"
                placeholder="+39 333 1234567"
              />
            </div>
            <div className="pt-4 border-t">
              <h4 className="font-semibold mb-4">Rating</h4>
              <div className="space-y-4">
                {AXES.map((axis) => (
                  <div key={axis} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>{AXIS_LABELS_IT[axis as AxisKey]}</Label>
                      <span className="text-sm font-semibold">{newPlayerData.ratings[axis as keyof typeof newPlayerData.ratings]}</span>
                    </div>
                    <Slider
                      min={1}
                      max={5}
                      step={1}
                      value={[newPlayerData.ratings[axis as keyof typeof newPlayerData.ratings]]}
                      onValueChange={(value) => setNewPlayerData({
                        ...newPlayerData,
                        ratings: { ...newPlayerData.ratings, [axis]: value[0] }
                      })}
                      data-testid={`slider-new-${axis}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreatingPlayer(false)}
            >
              Annulla
            </Button>
            <Button
              onClick={() => createPlayerMutation.mutate(newPlayerData)}
              disabled={!newPlayerData.name || !newPlayerData.surname || createPlayerMutation.isPending}
              data-testid="button-confirm-create-player"
            >
              {createPlayerMutation.isPending ? 'Creazione...' : 'Crea Giocatore'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add to Match Dialog */}
      <Dialog open={!!addingToMatch} onOpenChange={(open) => !open && setAddingToMatch(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Aggiungi {addingToMatch?.name} {addingToMatch?.surname} a Partita
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Partita</Label>
              <Select value={selectedMatch} onValueChange={setSelectedMatch}>
                <SelectTrigger data-testid="select-match">
                  <SelectValue placeholder="Seleziona partita" />
                </SelectTrigger>
                <SelectContent>
                  {matchesData?.items.map((match: any) => (
                    <SelectItem key={match.id} value={match.id}>
                      {match.sport} - {new Date(match.dateTime).toLocaleDateString('it-IT')} - {match.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Stato</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger data-testid="select-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STARTER">Titolare</SelectItem>
                  <SelectItem value="RESERVE">Riserva</SelectItem>
                  <SelectItem value="NEXT">Lista Attesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddingToMatch(null)}
            >
              Annulla
            </Button>
            <Button
              onClick={() => addingToMatch && selectedMatch && addToMatchMutation.mutate({
                playerId: addingToMatch.id,
                matchId: selectedMatch,
                status: selectedStatus
              })}
              disabled={!selectedMatch || addToMatchMutation.isPending}
              data-testid="button-confirm-add-to-match"
            >
              {addToMatchMutation.isPending ? 'Aggiunta...' : 'Conferma'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
