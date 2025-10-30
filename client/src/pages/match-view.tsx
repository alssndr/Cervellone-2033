import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import TeamPanel from '@/components/TeamPanel';
import RadarChart from '@/components/RadarChart';
import FieldView from '@/components/FieldView';
import { type MatchView } from '@shared/schema';
import { MapPin, Calendar, Users } from 'lucide-react';

interface MatchViewPageProps {
  params: { id: string };
}

export default function MatchViewPage({ params }: MatchViewPageProps) {
  const { id } = params;
  const [phone, setPhone] = useState('');
  const [inputPhone, setInputPhone] = useState('');
  const { toast } = useToast();
  
  // Interactive radar states
  const [hoveredPlayerId, setHoveredPlayerId] = useState<string | null>(null);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);

  // Player interaction handlers
  const handlePlayerHover = (playerId: string) => {
    setHoveredPlayerId(playerId);
  };

  const handlePlayerLeave = () => {
    setHoveredPlayerId(null);
  };

  const handlePlayerClick = (playerId: string, teamAssignment: 'LIGHT' | 'DARK') => {
    setSelectedPlayerIds(prev => {
      // If already selected, deselect
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId);
      }

      // Check in all player lists to find same team selections
      const allPlayers = data?.view ? [
        ...data.view.starters.light.map(p => ({ ...p, team: 'LIGHT' })),
        ...data.view.starters.dark.map(p => ({ ...p, team: 'DARK' })),
        ...data.view.reserves.light.map(p => ({ ...p, team: 'LIGHT' })),
        ...data.view.reserves.dark.map(p => ({ ...p, team: 'DARK' })),
      ] : [];

      // Find players from same team that are already selected
      const sameTeamPlayerIds = prev.filter(id => {
        const player = allPlayers.find(p => p.id === id);
        return player?.team === teamAssignment;
      });

      // If there's a player from same team selected, remove it and add the new one
      if (sameTeamPlayerIds.length > 0) {
        return [...prev.filter(id => !sameTeamPlayerIds.includes(id)), playerId];
      }

      // Check max 2 players total
      if (prev.length >= 2) {
        toast({
          title: 'Limite raggiunto',
          description: 'Puoi confrontare massimo 2 giocatori alla volta',
          variant: 'destructive',
        });
        return prev;
      }

      // Add player
      return [...prev, playerId];
    });
  };

  useEffect(() => {
    const saved = localStorage.getItem('demo_phone');
    if (saved) {
      setPhone(saved);
      setInputPhone(saved);
    }
  }, []);

  const { data, isLoading, error, refetch } = useQuery<{ ok: boolean; view: MatchView; error?: string }>({
    queryKey: [`/api/matches/${id}/public?phone=${encodeURIComponent(phone)}`],
    enabled: !!phone,
  });

  const changeStatusMutation = useMutation({
    mutationFn: async (newStatus: 'STARTER' | 'RESERVE' | 'NEXT') => {
      const response = await apiRequest('PATCH', `/api/matches/${id}/change-status`, {
        phone,
        status: newStatus,
      });
      return await response.json();
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.startsWith(`/api/matches/${id}/public`);
        }
      });
      toast({
        title: 'Stato aggiornato',
        description: 'Il tuo stato è stato modificato con successo',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: error.message || 'Impossibile aggiornare lo stato',
      });
    },
  });

  const handleLoad = () => {
    if (inputPhone.trim()) {
      localStorage.setItem('demo_phone', inputPhone);
      setPhone(inputPhone);
    }
  };

  if (!phone) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 p-8">
          <h2 className="text-xl font-semibold mb-4">Visualizza Partita</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Inserisci il tuo numero di telefono per visualizzare la partita
          </p>
          <div className="space-y-4">
            <input
              type="tel"
              placeholder="+39 333 1234567"
              value={inputPhone}
              onChange={(e) => setInputPhone(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blueTeam"
              data-testid="input-phone-viewer"
            />
            <Button onClick={handleLoad} className="w-full" data-testid="button-load-match">
              Carica Partita
            </Button>
          </div>
        </div>
      </div>
    );
  }

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

  if (error || !data?.ok || !data?.view) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-red-200 p-8">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Errore</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {data?.error || 'Impossibile caricare la partita'}
          </p>
          <Button 
            onClick={() => {
              setPhone('');
              setInputPhone('');
            }} 
            variant="outline"
            data-testid="button-retry"
          >
            Riprova
          </Button>
        </div>
      </div>
    );
  }

  const { match, me, starters, reserves, radar } = data.view;
  const next = (data.view as any).next; // Optional: next players if available

  const getSportLabel = (sport: string) => {
    switch (sport) {
      case 'THREE': return '3v3';
      case 'FIVE': return '5v5';
      case 'EIGHT': return '8v8';
      case 'ELEVEN': return '11v11';
      default: return sport;
    }
  };

  // Calculate radar datasets based on hover and selections
  const radarAdditionalDatasets = (() => {
    const datasets: Array<{
      data: Record<string, number>;
      label: string;
      color: string;
      visible?: boolean;
    }> = [];

    // Determine which players to show
    const playersToShow: string[] = [];
    
    // Always show selected players
    if (selectedPlayerIds.length > 0) {
      playersToShow.push(...selectedPlayerIds);
    }
    
    // Additionally show hovered player if not already selected
    if (hoveredPlayerId && !playersToShow.includes(hoveredPlayerId)) {
      playersToShow.push(hoveredPlayerId);
    }

    // Build datasets for each player to show
    playersToShow.forEach(playerId => {
      // Find player in all lists (starters + reserves)
      const allPlayers = [
        ...starters.light.map((p: any) => ({ ...p, team: 'LIGHT' })),
        ...starters.dark.map((p: any) => ({ ...p, team: 'DARK' })),
        ...reserves.light.map((p: any) => ({ ...p, team: 'LIGHT' })),
        ...reserves.dark.map((p: any) => ({ ...p, team: 'DARK' })),
      ];
      
      const player = allPlayers.find((p: any) => p.id === playerId);
      if (player && player.ratings) {
        const color = player.team === 'LIGHT' ? '#fc0fc0' : '#0000ff';
        
        datasets.push({
          data: player.ratings,
          label: player.name,
          color,
          visible: true,
        });
      }
    });

    return datasets;
  })();

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-ink mb-2" data-testid="text-match-title">
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

            {me && (
              <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
                <p className="text-xs text-muted-foreground mb-2">Il tuo ruolo</p>
                <Select
                  value={me.status}
                  onValueChange={(value) => changeStatusMutation.mutate(value as 'STARTER' | 'RESERVE' | 'NEXT')}
                  disabled={changeStatusMutation.isPending}
                >
                  <SelectTrigger className="w-full" data-testid="select-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STARTER" data-testid="option-starter">Titolare</SelectItem>
                    <SelectItem value="RESERVE" data-testid="option-reserve">Riserva</SelectItem>
                    <SelectItem value="NEXT" data-testid="option-next">Prossima volta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className={`px-4 py-2 rounded-lg inline-block ${
            match.status === 'OPEN' ? 'bg-green-100 text-green-800' :
            match.status === 'FROZEN' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            <span className="text-sm font-medium">
              {match.status === 'OPEN' ? 'Aperta' : match.status === 'FROZEN' ? 'Bloccata' : 'Chiusa'}
            </span>
          </div>
        </div>

        {/* Field View */}
        <div className="mb-8">
          <FieldView
            sport={match.sport}
            lightStarters={starters.light}
            darkStarters={starters.dark}
            reservesLight={reserves.light}
            reservesDark={reserves.dark}
          />
        </div>

        {/* Stats Section - Three Columns (Read-only) */}
        <div className="bg-white rounded-xl border border-gray-200 mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Stats</h2>
          </div>
          <div className="grid grid-cols-3 gap-6 p-6">
            {/* Squadra Chiara */}
            <div className="border-2 border-pinkTeam/30 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4" style={{ color: '#fc0fc0' }}>
                {match.teamNameLight}
              </h3>
              
              {/* Titolari */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-muted-foreground mb-2">Titolari</h4>
                <div className="space-y-2">
                  {starters.light.map((player) => {
                    const isSelected = selectedPlayerIds.includes(player.id);
                    const isHovered = hoveredPlayerId === player.id;
                    return (
                      <div
                        key={player.id}
                        className={`border rounded-lg p-3 cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-pinkTeam border-2 bg-pinkTeam/10' 
                            : isHovered
                            ? 'border-pinkTeam/50 border-2'
                            : 'border-gray-200'
                        }`}
                        data-testid={`light-starter-${player.id}`}
                        onMouseEnter={() => handlePlayerHover(player.id)}
                        onMouseLeave={handlePlayerLeave}
                        onClick={() => handlePlayerClick(player.id, 'LIGHT')}
                      >
                        <p className="font-medium text-sm">{player.name}</p>
                      </div>
                    );
                  })}
                  {starters.light.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">Nessun titolare</p>
                  )}
                </div>
              </div>

              {/* Riserve */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-muted-foreground mb-2">Riserve</h4>
                <div className="space-y-2">
                  {reserves.light.map((player) => {
                    const isSelected = selectedPlayerIds.includes(player.id);
                    const isHovered = hoveredPlayerId === player.id;
                    return (
                      <div
                        key={player.id}
                        className={`border rounded-lg p-3 cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-pinkTeam border-2 bg-pinkTeam/10' 
                            : isHovered
                            ? 'border-pinkTeam/50 border-2'
                            : 'border-gray-200'
                        }`}
                        data-testid={`light-reserve-${player.id}`}
                        onMouseEnter={() => handlePlayerHover(player.id)}
                        onMouseLeave={handlePlayerLeave}
                        onClick={() => handlePlayerClick(player.id, 'LIGHT')}
                      >
                        <p className="font-medium text-sm">{player.name}</p>
                      </div>
                    );
                  })}
                  {reserves.light.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">Nessuna riserva</p>
                  )}
                </div>
              </div>

              {/* Prossima volta */}
              {next && next.light && next.light.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">Prossima Volta</h4>
                  <div className="space-y-2">
                    {next.light.map((player: any) => {
                      const isSelected = selectedPlayerIds.includes(player.id);
                      const isHovered = hoveredPlayerId === player.id;
                      return (
                        <div
                          key={player.id}
                          className={`border rounded-lg p-3 cursor-pointer transition-all ${
                            isSelected 
                              ? 'border-pinkTeam border-2 bg-pinkTeam/10' 
                              : isHovered
                              ? 'border-pinkTeam/50 border-2'
                              : 'border-gray-200'
                          }`}
                          data-testid={`light-next-${player.id}`}
                          onMouseEnter={() => handlePlayerHover(player.id)}
                          onMouseLeave={handlePlayerLeave}
                          onClick={() => handlePlayerClick(player.id, 'LIGHT')}
                        >
                          <p className="font-medium text-sm">{player.name}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Radar Chart - Center Column */}
            <div className="flex flex-col items-center justify-center">
              <h3 className="text-lg font-semibold mb-4">Radar</h3>
              <RadarChart
                lightData={radar.light}
                darkData={radar.dark}
                lightLabel={match.teamNameLight}
                darkLabel={match.teamNameDark}
                additionalDatasets={radarAdditionalDatasets}
                hasSelections={selectedPlayerIds.length > 0}
              />
              {radarAdditionalDatasets.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  {hoveredPlayerId ? 'Hover attivo' : `${selectedPlayerIds.length} giocator${selectedPlayerIds.length === 1 ? 'e' : 'i'} selezionat${selectedPlayerIds.length === 1 ? 'o' : 'i'}`}
                </p>
              )}
            </div>

            {/* Squadra Scura */}
            <div className="border-2 border-blueTeam/30 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4" style={{ color: '#0000ff' }}>
                {match.teamNameDark}
              </h3>
              
              {/* Titolari */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-muted-foreground mb-2">Titolari</h4>
                <div className="space-y-2">
                  {starters.dark.map((player) => {
                    const isSelected = selectedPlayerIds.includes(player.id);
                    const isHovered = hoveredPlayerId === player.id;
                    return (
                      <div
                        key={player.id}
                        className={`border rounded-lg p-3 cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-blueTeam border-2 bg-blueTeam/10' 
                            : isHovered
                            ? 'border-blueTeam/50 border-2'
                            : 'border-gray-200'
                        }`}
                        data-testid={`dark-starter-${player.id}`}
                        onMouseEnter={() => handlePlayerHover(player.id)}
                        onMouseLeave={handlePlayerLeave}
                        onClick={() => handlePlayerClick(player.id, 'DARK')}
                      >
                        <p className="font-medium text-sm">{player.name}</p>
                      </div>
                    );
                  })}
                  {starters.dark.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">Nessun titolare</p>
                  )}
                </div>
              </div>

              {/* Riserve */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-muted-foreground mb-2">Riserve</h4>
                <div className="space-y-2">
                  {reserves.dark.map((player) => {
                    const isSelected = selectedPlayerIds.includes(player.id);
                    const isHovered = hoveredPlayerId === player.id;
                    return (
                      <div
                        key={player.id}
                        className={`border rounded-lg p-3 cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-blueTeam border-2 bg-blueTeam/10' 
                            : isHovered
                            ? 'border-blueTeam/50 border-2'
                            : 'border-gray-200'
                        }`}
                        data-testid={`dark-reserve-${player.id}`}
                        onMouseEnter={() => handlePlayerHover(player.id)}
                        onMouseLeave={handlePlayerLeave}
                        onClick={() => handlePlayerClick(player.id, 'DARK')}
                      >
                        <p className="font-medium text-sm">{player.name}</p>
                      </div>
                    );
                  })}
                  {reserves.dark.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">Nessuna riserva</p>
                  )}
                </div>
              </div>

              {/* Prossima volta */}
              {next && next.dark && next.dark.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">Prossima Volta</h4>
                  <div className="space-y-2">
                    {next.dark.map((player: any) => {
                      const isSelected = selectedPlayerIds.includes(player.id);
                      const isHovered = hoveredPlayerId === player.id;
                      return (
                        <div
                          key={player.id}
                          className={`border rounded-lg p-3 cursor-pointer transition-all ${
                            isSelected 
                              ? 'border-blueTeam border-2 bg-blueTeam/10' 
                              : isHovered
                              ? 'border-blueTeam/50 border-2'
                              : 'border-gray-200'
                          }`}
                          data-testid={`dark-next-${player.id}`}
                          onMouseEnter={() => handlePlayerHover(player.id)}
                          onMouseLeave={handlePlayerLeave}
                          onClick={() => handlePlayerClick(player.id, 'DARK')}
                        >
                          <p className="font-medium text-sm">{player.name}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
