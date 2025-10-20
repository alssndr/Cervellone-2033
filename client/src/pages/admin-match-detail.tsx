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
  variantType: 'V1' | 'V2' | 'V3' | 'V4';
  algo: string;
  score: number;
  meanDelta: number;
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
  const [v4LightIds, setV4LightIds] = useState<string[]>([]);
  const [v4DarkIds, setV4DarkIds] = useState<string[]>([]);
  const [isV4Dirty, setIsV4Dirty] = useState(false);

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
      const response = await apiRequest('POST', `/api/admin/matches/${id}/generate-lineups`, {});
      return await response.json();
    },
    onSuccess: async (result) => {
      if (result.ok) {
        await queryClient.invalidateQueries({ queryKey: ['/api/admin/matches', id, 'lineups'] });
        await queryClient.invalidateQueries({ queryKey: [`/api/matches/${id}/public`] });
        toast({
          title: 'Varianti generate!',
          description: `${result.count} varianti create (v1 applicata)`,
        });
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
      // Force immediate refetch to get updated team assignments (MUST include phone param!)
      await queryClient.refetchQueries({ queryKey: [`/api/matches/${id}/public?phone=+39 333 0000000`] });
      await queryClient.refetchQueries({ queryKey: ['/api/admin/matches', id, 'lineups'] });
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
      
      // Show loading feedback
      toast({
        title: '⚙️ Rigenerazione squadre...',
        description: 'Calcolo varianti in corso',
      });
      
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
        // Take the RECOMMENDED variant (the GREEDY_LOCAL one, best balanced)
        const recommendedVariant = lineupsData.variants.find((v: any) => v.recommended) || lineupsData.variants[0];
        console.log('[ADD_PLAYER] Applying recommended variant:', recommendedVariant.id);
        setSelectedVariant(recommendedVariant.id);
        await applyVariantMutation.mutateAsync(recommendedVariant.id);
        
        // Force immediate update of public view with cache invalidation (MUST include phone param!)
        await queryClient.invalidateQueries({ queryKey: [`/api/matches/${id}/public?phone=+39 333 0000000`] });
        await queryClient.refetchQueries({ queryKey: [`/api/matches/${id}/public?phone=+39 333 0000000`], type: 'active' });
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/admin/matches', id, 'signups'] });
      
      toast({
        title: '✅ Giocatore aggiunto!',
        description: 'Squadre ribilanciate',
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
        // Take the RECOMMENDED variant (the GREEDY_LOCAL one, best balanced)
        const recommendedVariant = lineupsData.variants.find((v: any) => v.recommended) || lineupsData.variants[0];
        console.log('[UPDATE_STATUS] Applying recommended variant:', recommendedVariant.id);
        setSelectedVariant(recommendedVariant.id);
        await applyVariantMutation.mutateAsync(recommendedVariant.id);
        
        // Force immediate update of public view (MUST include phone param!)
        await queryClient.refetchQueries({ queryKey: [`/api/matches/${id}/public?phone=+39 333 0000000`] });
      }
      
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

  // Save v4 manual variant mutation
  const saveV4Mutation = useMutation({
    mutationFn: async ({ lightIds, darkIds }: { lightIds: string[]; darkIds: string[] }) => {
      const response = await apiRequest('POST', `/api/admin/matches/${id}/save-manual-variant`, { lightIds, darkIds });
      return await response.json();
    },
    onSuccess: async (result) => {
      if (result.ok) {
        await queryClient.refetchQueries({ queryKey: ['/api/admin/matches', id, 'lineups'] });
        // Refetch ALL public view queries (matches any phone parameter)
        await queryClient.refetchQueries({ 
          predicate: (query) => {
            const key = query.queryKey[0] as string;
            return key?.startsWith(`/api/matches/${id}/public`);
          }
        });
        toast({
          title: 'v4 salvata!',
          description: `Differenza medie: ${result.meanDelta?.toFixed(3)}`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Errore salvataggio v4',
        description: error.message || 'Riprova',
      });
    },
  });

  // Generate MVP variant mutation
  const generateMVPMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/admin/matches/${id}/generate-mvp`, {});
      const data = await response.json();
      if (!data.ok) {
        throw new Error(data.error || 'Errore generazione MVP');
      }
      return data;
    },
    onSuccess: async (result) => {
      await queryClient.refetchQueries({ queryKey: ['/api/admin/matches', id, 'lineups'] });
      // Refetch ALL public view queries
      await queryClient.refetchQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.startsWith(`/api/matches/${id}/public`);
        }
      });
      toast({
        title: 'MVP generato!',
        description: 'Migliori giocatori selezionati e bilanciati',
      });
    },
    onError: (error: Error) => {
      // Reset selectedVariant on error to restore UI consistency
      setSelectedVariant(null);
      toast({
        variant: 'destructive',
        title: 'Errore generazione MVP',
        description: error.message || 'Riprova',
      });
    },
  });

  // Handle variant selection
  const handleVariantClick = async (variantId: string, variantIndex: number) => {
    if (variantId === 'mvp') {
      // Generate and apply MVP variant
      setSelectedVariant('mvp');
      await generateMVPMutation.mutateAsync();
      return;
    }
    
    if (variantId === 'v4') {
      // Enter v4 manual mode - load existing v4 or initialize
      setSelectedVariant('v4');
      setIsV4Dirty(false);
      
      const existingV4 = variantsData?.variants?.find(v => v.variantType === 'V4');
      
      if (existingV4) {
        // Load existing v4 variant
        setV4LightIds(existingV4.light);
        setV4DarkIds(existingV4.dark);
        toast({
          title: 'v4 Caricata',
          description: 'Variante manuale esistente caricata',
        });
      } else {
        // Initialize with split of current starters
        const starterSignups = signupsData?.signups?.filter(s => s.status === 'STARTER') || [];
        setV4LightIds(starterSignups.slice(0, Math.ceil(starterSignups.length / 2)).map(s => s.playerId));
        setV4DarkIds(starterSignups.slice(Math.ceil(starterSignups.length / 2)).map(s => s.playerId));
        toast({
          title: 'Modalità Manuale v4',
          description: 'Nuova configurazione - sposta giocatori per bilanciare',
        });
      }
      return;
    }

    setSelectedVariant(variantId);
    await applyVariantMutation.mutateAsync(variantId);
    
    // FORCE refetch of public match data to update field immediately
    await queryClient.refetchQueries({ queryKey: [`/api/matches/${id}/public?phone=+39 333 0000000`] });
  };

  // Move player to Light team (from Dark)
  const moveToLight = (playerId: string) => {
    setV4DarkIds(prev => prev.filter(id => id !== playerId));
    setV4LightIds(prev => [...prev, playerId]);
    setIsV4Dirty(true);
  };

  // Move player to Dark team (from Light)
  const moveToDark = (playerId: string) => {
    setV4LightIds(prev => prev.filter(id => id !== playerId));
    setV4DarkIds(prev => [...prev, playerId]);
    setIsV4Dirty(true);
  };

  // Auto-save v4 when teams change (only if dirty)
  useEffect(() => {
    if (selectedVariant === 'v4' && isV4Dirty && (v4LightIds.length > 0 || v4DarkIds.length > 0)) {
      const timeoutId = setTimeout(() => {
        saveV4Mutation.mutate({ lightIds: v4LightIds, darkIds: v4DarkIds });
        setIsV4Dirty(false);
      }, 500); // Debounce 500ms
      return () => clearTimeout(timeoutId);
    }
  }, [v4LightIds, v4DarkIds, selectedVariant, isV4Dirty]);

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

  // WebSocket for real-time player registration notifications
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/matches`);
    
    ws.onopen = () => {
      console.log('[WebSocket Client] Connected');
    };
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        // Only process events for this match
        if (message.matchId !== id) return;
        
        if (message.type === 'PLAYER_REGISTERED' || message.type === 'VARIANTS_REGENERATED') {
          console.log('[WebSocket Client] Received event:', message.type);
          
          // Show toast with OK button to apply regenerated v1
          toast({
            title: 'Nuova registrazione!',
            description: 'Si è aggiunto un nuovo giocatore. Sto rigenerando le squadre',
            action: (
              <Button 
                size="sm" 
                data-testid="button-websocket-ok"
                onClick={async () => {
                  // Refetch variants
                  await queryClient.refetchQueries({ queryKey: ['/api/admin/matches', id, 'lineups'] });
                  await queryClient.refetchQueries({ queryKey: [`/api/matches/${id}/public`] });
                  
                  // Apply v1 (first variant, most balanced)
                  const response = await apiRequest('GET', `/api/admin/matches/${id}/lineups`);
                  const lineupsData = await response.json();
                  if (lineupsData?.variants && lineupsData.variants.length > 0) {
                    const v1 = lineupsData.variants[0];
                    setSelectedVariant(v1.id);
                    await applyVariantMutation.mutateAsync(v1.id);
                  }
                }}
              >
                OK
              </Button>
            ),
          });
        }
      } catch (err) {
        console.error('[WebSocket Client] Error parsing message:', err);
      }
    };
    
    ws.onerror = (error) => {
      console.error('[WebSocket Client] Error:', error);
    };
    
    ws.onclose = () => {
      console.log('[WebSocket Client] Disconnected');
    };
    
    return () => {
      ws.close();
    };
  }, [id]);

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

  // Calculate team averages for selected variant
  const calculateTeamAverages = () => {
    if (!selectedVariant || selectedVariant === 'custom') {
      // Use current match data (radar already has averages)
      const lightAvg = Object.values(radar.light).reduce((sum, val) => sum + val, 0) / 6;
      const darkAvg = Object.values(radar.dark).reduce((sum, val) => sum + val, 0) / 6;
      return { light: lightAvg.toFixed(1), dark: darkAvg.toFixed(1) };
    }

    // Find the selected variant and calculate from its players
    const variant = variantsData?.variants?.find(v => v.id === selectedVariant);
    if (!variant) {
      return { light: '0.0', dark: '0.0' };
    }

    // Calculate averages from variant player lists (would need player ratings)
    // For now, use radar data as approximation
    const lightAvg = Object.values(radar.light).reduce((sum, val) => sum + val, 0) / 6;
    const darkAvg = Object.values(radar.dark).reduce((sum, val) => sum + val, 0) / 6;
    return { light: lightAvg.toFixed(1), dark: darkAvg.toFixed(1) };
  };

  const teamAverages = calculateTeamAverages();

  // Get enrolled player IDs
  const enrolledPlayerIds = new Set(
    signupsData?.signups?.map(s => s.playerId) || []
  );

  // Filter available players (not yet enrolled)
  const availablePlayers = playersData?.players?.filter(
    p => !enrolledPlayerIds.has(p.id)
  ) || [];

  // Enrolled players with signup info, sorted by status (STARTER → RESERVE → NEXT)
  const statusOrder = { 'STARTER': 0, 'RESERVE': 1, 'NEXT': 2 };
  const enrolledPlayers = (signupsData?.signups || []).sort((a: any, b: any) => {
    return (statusOrder[a.status as keyof typeof statusOrder] || 999) - 
           (statusOrder[b.status as keyof typeof statusOrder] || 999);
  });

  // Calculate maximum starters allowed PER TEAM (total is double)
  const maxStartersPerTeam = match.sport === 'THREE' ? 3 : 
                              match.sport === 'FIVE' ? 5 :
                              match.sport === 'EIGHT' ? 8 : 11;
  const maxStartersTotal = maxStartersPerTeam * 2;
  const currentStarters = signupsData?.signups?.filter(s => s.status === 'STARTER').length || 0;
  const isStartersLimitReached = currentStarters >= maxStartersTotal;

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
              
              {/* Team Averages */}
              <div className="mb-3">
                <div className="inline-flex items-center gap-3 px-4 py-2 bg-muted rounded-lg">
                  <span className="font-bold text-lg" style={{ color: '#fc0fc0' }}>
                    {teamAverages.light}
                  </span>
                  <span className="text-inkMuted font-medium">vs</span>
                  <span className="font-bold text-lg" style={{ color: '#0000ff' }}>
                    {teamAverages.dark}
                  </span>
                  <span className="text-xs text-inkMuted ml-2">medie squadre</span>
                </div>
              </div>
              
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
              {topVariants.map((variant) => (
                <button
                  key={variant.id}
                  onClick={() => handleVariantClick(variant.id, variant.ordinal)}
                  disabled={applyVariantMutation.isPending}
                  className={`relative w-12 h-12 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                    selectedVariant === variant.id
                      ? 'bg-blueTeam text-white shadow-lg'
                      : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-blueTeam'
                  } ${applyVariantMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                  data-testid={`variant-selector-${variant.variantType.toLowerCase()}`}
                >
                  {variant.variantType.toLowerCase()}
                  {variant.recommended && selectedVariant !== variant.id && (
                    <Check className="w-3 h-3 absolute -top-1 -right-1 text-green-600" />
                  )}
                </button>
              ))}
              <button
                onClick={() => handleVariantClick('v4', -1)}
                disabled={applyVariantMutation.isPending}
                className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                  selectedVariant === 'v4'
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-purple-600'
                } ${applyVariantMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                data-testid="variant-selector-v4"
              >
                v!
              </button>
              <button
                onClick={() => handleVariantClick('mvp', -1)}
                disabled={generateMVPMutation.isPending || applyVariantMutation.isPending}
                className={`w-14 h-12 rounded-full flex items-center justify-center font-semibold text-xs transition-all ${
                  selectedVariant === 'mvp'
                    ? 'bg-amber-600 text-white shadow-lg'
                    : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-amber-600'
                } ${(generateMVPMutation.isPending || applyVariantMutation.isPending) ? 'opacity-50 cursor-not-allowed' : ''}`}
                data-testid="variant-selector-mvp"
              >
                MVP
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

          {/* v4 Manual Mode UI */}
          {selectedVariant === 'v4' && (
            <div className="mt-6 bg-purple-50 border-2 border-purple-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-purple-900 mb-4">Modalità Manuale v4 - Sposta Giocatori</h3>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Light Team */}
                <div>
                  <h4 className="font-medium text-pink-700 mb-3 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-pinkTeam"></div>
                    Squadra Chiara ({v4LightIds.length})
                  </h4>
                  <div className="space-y-2">
                    {v4LightIds.map(playerId => {
                      const signup = signupsData?.signups?.find(s => s.playerId === playerId);
                      return (
                        <div key={playerId} className="flex items-center gap-2 bg-white p-2 rounded border">
                          <span className="flex-1 text-sm">{signup?.player?.name} {signup?.player?.surname}</span>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => moveToDark(playerId)}
                            data-testid={`move-dark-${playerId}`}
                          >
                            →
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Dark Team */}
                <div>
                  <h4 className="font-medium text-blue-700 mb-3 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blueTeam"></div>
                    Squadra Scura ({v4DarkIds.length})
                  </h4>
                  <div className="space-y-2">
                    {v4DarkIds.map(playerId => {
                      const signup = signupsData?.signups?.find(s => s.playerId === playerId);
                      return (
                        <div key={playerId} className="flex items-center gap-2 bg-white p-2 rounded border">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => moveToLight(playerId)}
                            data-testid={`move-light-${playerId}`}
                          >
                            ←
                          </Button>
                          <span className="flex-1 text-sm">{signup?.player?.name} {signup?.player?.surname}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              {saveV4Mutation.isPending && (
                <p className="mt-4 text-sm text-purple-600">Salvataggio v4...</p>
              )}
            </div>
          )}
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

        {/* Enrolled Players Section - Two Columns */}
        {enrolledPlayers.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Giocatori Schierati ({enrolledPlayers.length})</h2>
            <div className="grid md:grid-cols-2 gap-6">
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
                      const signup = signupsData?.signups?.find(s => s.playerId === player.id);
                      if (!signup) return null;
                      const isLastStarter = currentStarters === 1;
                      return (
                        <div
                          key={player.id}
                          className="border border-gray-200 rounded-lg p-3"
                          data-testid={`light-starter-${player.id}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{player.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Media: {calculatePlayerAverage(signup.ratings)}
                              </p>
                            </div>
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
                              <SelectTrigger className="h-8 text-xs w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="STARTER">Titolare</SelectItem>
                                <SelectItem value="RESERVE" disabled={isLastStarter}>
                                  Riserva {isLastStarter && '(Serve 1 titolare)'}
                                </SelectItem>
                                <SelectItem value="NEXT" disabled={isLastStarter}>
                                  Prossimo {isLastStarter && '(Serve 1 titolare)'}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
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
                      const signup = signupsData?.signups?.find(s => s.playerId === player.id);
                      if (!signup) return null;
                      return (
                        <div
                          key={player.id}
                          className="border border-gray-200 rounded-lg p-3"
                          data-testid={`light-reserve-${player.id}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{player.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Media: {calculatePlayerAverage(signup.ratings)}
                              </p>
                            </div>
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
                              <SelectTrigger className="h-8 text-xs w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="STARTER" disabled={isStartersLimitReached}>
                                  Titolare {isStartersLimitReached && '(Completo)'}
                                </SelectItem>
                                <SelectItem value="RESERVE">Riserva</SelectItem>
                                <SelectItem value="NEXT">Prossimo</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      );
                    })}
                    {reserves.light.length === 0 && (
                      <p className="text-sm text-muted-foreground italic">Nessuna riserva</p>
                    )}
                  </div>
                </div>

                {/* Prossima volta */}
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">Prossima Volta</h4>
                  <div className="space-y-2">
                    {signupsData?.signups?.filter((s: any) => s.status === 'NEXT' && s.reserveTeam === 'LIGHT').map((signup: any) => (
                      <div
                        key={signup.signupId}
                        className="border border-gray-200 rounded-lg p-3"
                        data-testid={`light-next-${signup.playerId}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{signup.player?.name} {signup.player?.surname}</p>
                            <p className="text-xs text-muted-foreground">
                              Media: {calculatePlayerAverage(signup.ratings)}
                            </p>
                          </div>
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
                            <SelectTrigger className="h-8 text-xs w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="STARTER" disabled={isStartersLimitReached}>
                                Titolare {isStartersLimitReached && '(Completo)'}
                              </SelectItem>
                              <SelectItem value="RESERVE">Riserva</SelectItem>
                              <SelectItem value="NEXT">Prossimo</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                    {!signupsData?.signups?.some((s: any) => s.status === 'NEXT' && s.reserveTeam === 'LIGHT') && (
                      <p className="text-sm text-muted-foreground italic">Nessuno in attesa</p>
                    )}
                  </div>
                </div>
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
                      const signup = signupsData?.signups?.find(s => s.playerId === player.id);
                      if (!signup) return null;
                      const isLastStarter = currentStarters === 1;
                      return (
                        <div
                          key={player.id}
                          className="border border-gray-200 rounded-lg p-3"
                          data-testid={`dark-starter-${player.id}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{player.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Media: {calculatePlayerAverage(signup.ratings)}
                              </p>
                            </div>
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
                              <SelectTrigger className="h-8 text-xs w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="STARTER">Titolare</SelectItem>
                                <SelectItem value="RESERVE" disabled={isLastStarter}>
                                  Riserva {isLastStarter && '(Serve 1 titolare)'}
                                </SelectItem>
                                <SelectItem value="NEXT" disabled={isLastStarter}>
                                  Prossimo {isLastStarter && '(Serve 1 titolare)'}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
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
                      const signup = signupsData?.signups?.find(s => s.playerId === player.id);
                      if (!signup) return null;
                      return (
                        <div
                          key={player.id}
                          className="border border-gray-200 rounded-lg p-3"
                          data-testid={`dark-reserve-${player.id}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{player.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Media: {calculatePlayerAverage(signup.ratings)}
                              </p>
                            </div>
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
                              <SelectTrigger className="h-8 text-xs w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="STARTER" disabled={isStartersLimitReached}>
                                  Titolare {isStartersLimitReached && '(Completo)'}
                                </SelectItem>
                                <SelectItem value="RESERVE">Riserva</SelectItem>
                                <SelectItem value="NEXT">Prossimo</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      );
                    })}
                    {reserves.dark.length === 0 && (
                      <p className="text-sm text-muted-foreground italic">Nessuna riserva</p>
                    )}
                  </div>
                </div>

                {/* Prossima volta */}
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">Prossima Volta</h4>
                  <div className="space-y-2">
                    {signupsData?.signups?.filter((s: any) => s.status === 'NEXT' && s.reserveTeam === 'DARK').map((signup: any) => (
                      <div
                        key={signup.signupId}
                        className="border border-gray-200 rounded-lg p-3"
                        data-testid={`dark-next-${signup.playerId}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{signup.player?.name} {signup.player?.surname}</p>
                            <p className="text-xs text-muted-foreground">
                              Media: {calculatePlayerAverage(signup.ratings)}
                            </p>
                          </div>
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
                            <SelectTrigger className="h-8 text-xs w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="STARTER" disabled={isStartersLimitReached}>
                                Titolare {isStartersLimitReached && '(Completo)'}
                              </SelectItem>
                              <SelectItem value="RESERVE">Riserva</SelectItem>
                              <SelectItem value="NEXT">Prossimo</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                    {!signupsData?.signups?.some((s: any) => s.status === 'NEXT' && s.reserveTeam === 'DARK') && (
                      <p className="text-sm text-muted-foreground italic">Nessuno in attesa</p>
                    )}
                  </div>
                </div>
              </div>
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
