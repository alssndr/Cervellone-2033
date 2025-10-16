import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import TeamPanel from '@/components/TeamPanel';
import RadarChart from '@/components/RadarChart';
import FieldView from '@/components/FieldView';
import { type Match, type Sport, AXES, AXIS_LABELS_IT } from '@shared/schema';
import { ArrowLeft, Calendar, MapPin, Users, Check, UserPlus } from 'lucide-react';

interface MatchViewData {
  ok: boolean;
  view: {
    match: {
      sport: Sport;
      dateTime: string;
      location: string;
      status: string;
      teamNameLight: string;
      teamNameDark: string;
    };
    starters: {
      light: { id: string; name: string }[];
      dark: { id: string; name: string }[];
    };
    reserves: {
      light: { id: string; name: string }[];
      dark: { id: string; name: string }[];
    };
    radar: {
      light: Record<string, number>;
      dark: Record<string, number>;
    };
  };
}

interface LineupVariant {
  id: string;
  ordinal: number;
  algo: string;
  score: number;
  recommended: boolean;
  light: string[];
  dark: string[];
}

interface AdminMatchDetailProps {
  params: { id: string };
}

export default function AdminMatchDetail({ params }: AdminMatchDetailProps) {
  const { id } = params;
  const { toast } = useToast();
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [addingPlayer, setAddingPlayer] = useState<any | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('STARTER');

  // Fetch match data (using public endpoint for now, can be enhanced with admin endpoint)
  const { data: matchData, isLoading } = useQuery<MatchViewData>({
    queryKey: [`/api/matches/${id}/public?phone=+39 333 0000000`], // Admin phone
  });

  // Fetch lineup variants
  const { data: variantsData } = useQuery<{ ok: boolean; variants: LineupVariant[] }>({
    queryKey: ['/api/admin/matches', id, 'lineups'],
  });

  // Fetch all players
  const { data: playersData } = useQuery<{ ok: boolean; players: any[] }>({
    queryKey: ['/api/admin/players'],
  });

  // Fetch match signups
  const { data: signupsData } = useQuery<{ ok: boolean; signups: any[] }>({
    queryKey: ['/api/admin/matches', id, 'signups'],
  });

  // Generate variants mutation
  const generateVariantsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/admin/matches/${id}/generate-lineups`, { count: 5 });
      return await response.json();
    },
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/matches', id, 'lineups'] });
        toast({
          title: 'Varianti generate!',
          description: `${result.count} varianti create`,
        });
        // Auto-select first variant
        if (variantsData?.variants?.[0]) {
          setSelectedVariant(variantsData.variants[0].id);
        }
      }
    },
  });

  // Apply variant mutation
  const applyVariantMutation = useMutation({
    mutationFn: async (lineupVersionId: string) => {
      const response = await apiRequest('POST', `/api/admin/matches/${id}/apply-lineup`, { lineupVersionId });
      return await response.json();
    },
    onSuccess: async () => {
      // Force refetch to get updated team assignments
      await queryClient.refetchQueries({ queryKey: [`/api/matches/${id}/public`] });
      toast({
        title: 'Variante applicata!',
        description: 'Le squadre aggiornate',
      });
    },
  });

  // Add player to match mutation
  const addPlayerMutation = useMutation({
    mutationFn: async ({ playerId, status }: { playerId: string; status: string }) => {
      const response = await apiRequest('POST', `/api/admin/players/${playerId}/add-to-match`, { matchId: id, status });
      const data = await response.json();
      if (!data.ok) {
        throw new Error(data.error || 'Errore sconosciuto');
      }
      return data;
    },
    onSuccess: async () => {
      setAddingPlayer(null);
      setSelectedStatus('STARTER');
      
      // Reset selected variant before regenerating
      setSelectedVariant(null);
      
      // Regenerate lineups to include the new player
      await generateVariantsMutation.mutateAsync();
      
      // Wait a bit for cache to clear, then fetch fresh WITH AUTH
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Fetch directly from server with authentication (bypass all cache)
      const response = await apiRequest('GET', `/api/admin/matches/${id}/lineups`);
      const lineupsData = await response.json();
      
      if (lineupsData?.variants && lineupsData.variants.length > 0) {
        const firstVariant = lineupsData.variants[0];
        console.log('[ADD_PLAYER] Applying variant:', firstVariant.id);
        setSelectedVariant(firstVariant.id);
        await applyVariantMutation.mutateAsync(firstVariant.id);
      }
      
      await queryClient.refetchQueries({ queryKey: [`/api/matches/${id}/public`] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/matches', id, 'signups'] });
      
      toast({
        title: 'Giocatore aggiunto',
        description: 'Squadre ribilanciate automaticamente',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: error.message,
      });
    },
  });

  // Update signup status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ signupId, status }: { signupId: string; status: string }) => {
      const response = await apiRequest('PATCH', `/api/admin/signups/${signupId}/status`, { status });
      const data = await response.json();
      if (!data.ok) {
        throw new Error(data.error || 'Errore sconosciuto');
      }
      return data;
    },
    onSuccess: async () => {
      // Reset and regenerate lineups to reflect status change
      setSelectedVariant(null);
      await generateVariantsMutation.mutateAsync();
      
      // Wait a bit, then fetch fresh from server WITH AUTH
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Fetch directly from server with authentication (bypass all cache)
      const response = await apiRequest('GET', `/api/admin/matches/${id}/lineups`);
      const lineupsData = await response.json();
      
      if (lineupsData?.variants && lineupsData.variants.length > 0) {
        const firstVariant = lineupsData.variants[0];
        console.log('[UPDATE_STATUS] Applying variant:', firstVariant.id);
        setSelectedVariant(firstVariant.id);
        await applyVariantMutation.mutateAsync(firstVariant.id);
      }
      
      await queryClient.refetchQueries({ queryKey: [`/api/matches/${id}/public`] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/matches', id, 'signups'] });
      
      toast({
        title: 'Stato aggiornato',
        description: 'Squadre ribilanciate automaticamente',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: error.message,
      });
    },
  });

  // Handle variant selection
  const handleVariantClick = (variantId: string, variantIndex: number) => {
    if (variantId === 'custom') {
      setSelectedVariant('custom');
      toast({
        title: 'Modalità Personalizzata',
        description: 'Funzionalità drag&drop in arrivo',
      });
      return;
    }

    setSelectedVariant(variantId);
    applyVariantMutation.mutate(variantId);
  };

  const calculatePlayerAverage = (ratings: any) => {
    if (!ratings) return 0;
    const values = AXES.map(axis => ratings[axis] || 0);
    const sum = values.reduce((a, b) => a + b, 0);
    return (sum / values.length).toFixed(1);
  };

  const getSportLabel = (sport: Sport) => {
    switch (sport) {
      case 'THREE': return '3v3';
      case 'FIVE': return '5v5';
      case 'EIGHT': return '8v8';
      case 'ELEVEN': return '11v11';
    }
  };

  // Auto-generate variants if none exist
  useEffect(() => {
    if (matchData?.ok && (!variantsData?.variants || variantsData.variants.length === 0)) {
      generateVariantsMutation.mutate();
    }
  }, [matchData]);

  // Auto-apply first variant when variants are loaded
  useEffect(() => {
    if (variantsData?.variants && variantsData.variants.length > 0 && !selectedVariant) {
      const firstVariant = variantsData.variants[0];
      setSelectedVariant(firstVariant.id);
      applyVariantMutation.mutate(firstVariant.id);
    }
  }, [variantsData?.variants]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blueTeam mb-4"></div>
          <p className="text-inkMuted">Caricamento partita...</p>
        </div>
      </div>
    );
  }

  if (!matchData?.ok || !matchData?.view) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Errore nel caricamento della partita</p>
          <Link href="/admin/matches">
            <Button variant="outline">Torna alle partite</Button>
          </Link>
        </div>
      </div>
    );
  }

  const { match, starters, reserves, radar } = matchData.view;
  const topVariants = variantsData?.variants?.slice(0, 3) || [];

  // Get enrolled player IDs
  const enrolledPlayerIds = new Set(
    signupsData?.signups?.map(s => s.playerId) || []
  );

  // Filter available players (not yet enrolled)
  const availablePlayers = playersData?.players?.filter(
    p => !enrolledPlayerIds.has(p.id)
  ) || [];

  // Enrolled players with signup info
  const enrolledPlayers = signupsData?.signups || [];

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'STARTER': return 'Titolare';
      case 'RESERVE': return 'Riserva';
      case 'NEXT': return 'Prossimo';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/admin/matches">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Torna alle partite
            </Button>
          </Link>

          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-ink mb-2">
                {match.teamNameLight} vs {match.teamNameDark}
              </h1>
              <div className="flex flex-wrap gap-4 text-sm text-inkMuted">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(match.dateTime).toLocaleString('it-IT')}
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {match.location}
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {getSportLabel(match.sport)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Field View Header with Variants */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Campo {getSportLabel(match.sport)}</h2>
            
            {/* Variant Selectors */}
            <div className="flex items-center gap-2">
              {topVariants.map((variant, idx) => (
                <button
                  key={variant.id}
                  onClick={() => handleVariantClick(variant.id, idx)}
                  disabled={applyVariantMutation.isPending}
                  className={`relative w-12 h-12 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                    selectedVariant === variant.id
                      ? 'bg-blueTeam text-white shadow-lg'
                      : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-blueTeam'
                  } ${applyVariantMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                  data-testid={`variant-selector-${idx + 1}`}
                >
                  v{idx + 1}
                  {variant.recommended && selectedVariant !== variant.id && (
                    <Check className="w-3 h-3 absolute -top-1 -right-1 text-green-600" />
                  )}
                </button>
              ))}
              <button
                onClick={() => handleVariantClick('custom', -1)}
                disabled={applyVariantMutation.isPending}
                className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                  selectedVariant === 'custom'
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-purple-600'
                } ${applyVariantMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                data-testid="variant-selector-custom"
              >
                v!
              </button>
            </div>
          </div>

          <FieldView
            sport={match.sport}
            lightStarters={starters.light}
            darkStarters={starters.dark}
            reservesLight={reserves.light}
            reservesDark={reserves.dark}
          />
        </div>

        {/* Team Rosters - Text View */}
        {(starters.light.length > 0 || starters.dark.length > 0) && (
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="rounded-xl border border-card-border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4" style={{ color: '#fc0fc0' }}>
                {match.teamNameLight} (Chiari)
              </h3>
              <div className="space-y-2">
                {starters.light.map((player, idx) => (
                  <div
                    key={player.id}
                    className="px-4 py-2 rounded-lg bg-muted text-sm font-medium"
                    data-testid={`roster-light-${player.id}`}
                  >
                    {idx + 1}. {player.name}
                  </div>
                ))}
                {starters.light.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">Nessun giocatore</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-card-border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4" style={{ color: '#0000ff' }}>
                {match.teamNameDark} (Scuri)
              </h3>
              <div className="space-y-2">
                {starters.dark.map((player, idx) => (
                  <div
                    key={player.id}
                    className="px-4 py-2 rounded-lg bg-muted text-sm font-medium"
                    data-testid={`roster-dark-${player.id}`}
                  >
                    {idx + 1}. {player.name}
                  </div>
                ))}
                {starters.dark.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">Nessun giocatore</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Radar Chart */}
        <div className="bg-white rounded-xl border border-gray-200 mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Confronto Radar</h2>
          </div>
          <RadarChart
            lightData={radar.light}
            darkData={radar.dark}
            lightLabel={match.teamNameLight}
            darkLabel={match.teamNameDark}
          />
        </div>

        {/* Team Stats */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <TeamPanel 
            teamLabel={`${match.teamNameLight} — Medie`}
            axisMeans={radar.light}
          />
          <TeamPanel 
            teamLabel={`${match.teamNameDark} — Medie`}
            axisMeans={radar.dark}
          />
        </div>

        {/* Enrolled Players Section */}
        {enrolledPlayers.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Giocatori Schierati ({enrolledPlayers.length})</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {enrolledPlayers.map((signup: any) => (
                <div
                  key={signup.signupId}
                  className="border border-gray-200 rounded-lg p-4"
                  data-testid={`enrolled-player-${signup.playerId}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm">
                        {signup.player?.name} {signup.player?.surname}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate">
                        {signup.player?.phone || 'Nessun telefono'}
                      </p>
                      <div className="mt-2">
                        <span className="text-2xl font-bold text-blueTeam">
                          {calculatePlayerAverage(signup.ratings)}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">media</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 w-32">
                      <Select 
                        value={signup.status} 
                        onValueChange={(newStatus) => {
                          updateStatusMutation.mutate({
                            signupId: signup.signupId,
                            status: newStatus,
                          });
                        }}
                        disabled={updateStatusMutation.isPending}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="STARTER">Titolare</SelectItem>
                          <SelectItem value="RESERVE">Riserva</SelectItem>
                          <SelectItem value="NEXT">Prossimo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available Players Section */}
        {availablePlayers.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Aggiungi Giocatore ({availablePlayers.length} disponibili)</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {availablePlayers.map((player: any) => (
                <div
                  key={player.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blueTeam transition-colors"
                  data-testid={`player-compact-${player.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">
                        {player.name} {player.surname}
                      </h3>
                      <p className="text-xs text-muted-foreground">{player.phone || 'Nessun telefono'}</p>
                      <div className="mt-2">
                        <span className="text-2xl font-bold text-blueTeam">
                          {calculatePlayerAverage(player.currentRatings)}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">media</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAddingPlayer(player)}
                      data-testid={`button-add-player-${player.id}`}
                    >
                      <UserPlus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {availablePlayers.length === 0 && enrolledPlayers.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
            <p className="text-muted-foreground">Nessun giocatore disponibile</p>
          </div>
        )}
      </div>

      {/* Add Player Dialog */}
      <Dialog open={!!addingPlayer} onOpenChange={(open) => !open && setAddingPlayer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aggiungi {addingPlayer?.name} {addingPlayer?.surname}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="status">Stato</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STARTER">Titolare</SelectItem>
                  <SelectItem value="RESERVE">Riserva</SelectItem>
                  <SelectItem value="NEXT">Prossimo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddingPlayer(null)}
            >
              Annulla
            </Button>
            <Button
              onClick={() => {
                if (addingPlayer) {
                  addPlayerMutation.mutate({
                    playerId: addingPlayer.id,
                    status: selectedStatus,
                  });
                }
              }}
              disabled={addPlayerMutation.isPending}
            >
              {addPlayerMutation.isPending ? 'Aggiunta...' : 'Aggiungi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
