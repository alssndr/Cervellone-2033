import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import TeamPanel from '@/components/TeamPanel';
import RadarChart from '@/components/RadarChart';
import FieldView from '@/components/FieldView';
import { type Match, type Sport, AXES, AXIS_LABELS_IT } from '@shared/schema';
import { ArrowLeft, Calendar, MapPin, Users, Check, Pencil, Trash2 } from 'lucide-react';

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
    next?: {
      light: { playerId: string; name: string }[];
      dark: { playerId: string; name: string }[];
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
  const [, setLocation] = useLocation();
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [v4LightIds, setV4LightIds] = useState<string[]>([]);
  const [v4DarkIds, setV4DarkIds] = useState<string[]>([]);
  const [isV4Dirty, setIsV4Dirty] = useState(false);
  
  // Interactive radar states
  const [hoveredPlayerId, setHoveredPlayerId] = useState<string | null>(null);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  
  // Rename teams dialog
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [newTeamNameLight, setNewTeamNameLight] = useState('');
  const [newTeamNameDark, setNewTeamNameDark] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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

      // Find players from same team that are already selected
      const sameTeamPlayerIds = prev.filter(id => {
        const signup = signupsData?.signups?.find(s => s.playerId === id);
        return signup?.teamAssignment === teamAssignment;
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

  // Rename teams mutation
  const renameTeamsMutation = useMutation({
    mutationFn: async ({ teamNameLight, teamNameDark }: { teamNameLight: string; teamNameDark: string }) => {
      const response = await apiRequest('PATCH', `/api/admin/matches/${id}/names`, { teamNameLight, teamNameDark });
      return await response.json();
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: [`/api/matches/${id}/public?phone=+39 333 0000000`] });
      setShowRenameDialog(false);
      toast({
        title: 'Nomi squadre aggiornati!',
        description: 'I nuovi nomi sono stati salvati',
      });
    },
  });

  const deleteMatchMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', `/api/admin/matches/${id}`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Partita eliminata',
        description: 'La partita è stata rimossa con successo',
      });
      setLocation('/admin/matches');
    },
    onError: (error: Error) => {
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile eliminare la partita',
        variant: 'destructive',
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
    onSuccess: async (_data, variables) => {
      const { status } = variables;
      
      // Only regenerate lineups if adding a STARTER
      // Reserves and NEXT players don't affect team balance
      if (status === 'STARTER') {
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
        
        toast({
          title: '✅ Giocatore aggiunto!',
          description: 'Squadre ribilanciate',
        });
      } else {
        // For RESERVE and NEXT, just refresh the signups list
        toast({
          title: '✅ Giocatore aggiunto!',
          description: status === 'RESERVE' ? 'Aggiunto alle riserve' : 'Aggiunto per la prossima volta',
        });
      }
      
      // Always invalidate signups and public view
      queryClient.invalidateQueries({ queryKey: ['/api/admin/matches', id, 'signups'] });
      queryClient.invalidateQueries({ queryKey: [`/api/matches/${id}/public?phone=+39 333 0000000`] });
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

  // Handle variant selection
  const handleVariantClick = async (variantId: string, variantIndex: number) => {
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

  const { match, starters, reserves, next, radar } = matchData.view;
  // Show only V1, V2, V3 in top variants (exclude V4 and MVP which have their own buttons)
  const topVariants = variantsData?.variants?.filter(v => ['V1', 'V2', 'V3'].includes(v.variantType)) || [];

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
      const signup = signupsData?.signups?.find(s => s.playerId === playerId);
      if (signup && signup.ratings) {
        const playerName = signup.player?.name || 'Giocatore';
        const playerSurname = signup.player?.surname || '';
        
        // Determine team based on player position in lists
        const isInLightTeam = starters.light.some(p => p.id === playerId) ||
                             reserves.light.some(p => p.id === playerId) ||
                             (next && next.light.some(p => p.playerId === playerId));
        const color = isInLightTeam ? '#fc0fc0' : '#0000ff';
        
        datasets.push({
          data: signup.ratings,
          label: `${playerName} ${playerSurname}`.trim(),
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
          <div className="flex items-center justify-between mb-4">
            <Link href="/admin/matches">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Torna alle partite
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              data-testid="button-delete-match"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Elimina Partita
            </Button>
          </div>

          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-3xl font-bold text-ink">
                  {match.teamNameLight} vs {match.teamNameDark}
                </h1>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover-elevate"
                  onClick={() => {
                    setNewTeamNameLight(match.teamNameLight || 'Chiari');
                    setNewTeamNameDark(match.teamNameDark || 'Scuri');
                    setShowRenameDialog(true);
                  }}
                  data-testid="button-rename-teams"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>
              
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

            {/* Variant Selectors - aligned right */}
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
            </div>
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

        {/* Stats Section - Three Columns */}
        {enrolledPlayers.length > 0 && (
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
                      const signup = signupsData?.signups?.find(s => s.playerId === player.id);
                      if (!signup) return null;
                      const isLastStarter = currentStarters === 1;
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
                                {!isStartersLimitReached && <SelectItem value="STARTER">Titolare</SelectItem>}
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
                    {signupsData?.signups?.filter((s: any) => s.status === 'NEXT' && s.reserveTeam === 'LIGHT').map((signup: any) => {
                      const isSelected = selectedPlayerIds.includes(signup.playerId);
                      const isHovered = hoveredPlayerId === signup.playerId;
                      return (
                        <div
                          key={signup.signupId}
                          className={`border rounded-lg p-3 cursor-pointer transition-all ${
                            isSelected 
                              ? 'border-pinkTeam border-2 bg-pinkTeam/10' 
                              : isHovered
                              ? 'border-pinkTeam/50 border-2'
                              : 'border-gray-200'
                          }`}
                          data-testid={`light-next-${signup.playerId}`}
                          onMouseEnter={() => handlePlayerHover(signup.playerId)}
                          onMouseLeave={handlePlayerLeave}
                          onClick={() => handlePlayerClick(signup.playerId, 'LIGHT')}
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
                                {!isStartersLimitReached && <SelectItem value="STARTER">Titolare</SelectItem>}
                                <SelectItem value="RESERVE">Riserva</SelectItem>
                                <SelectItem value="NEXT">Prossimo</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      );
                    })}
                    {!signupsData?.signups?.some((s: any) => s.status === 'NEXT' && s.reserveTeam === 'LIGHT') && (
                      <p className="text-sm text-muted-foreground italic">Nessuno in attesa</p>
                    )}
                  </div>
                </div>
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
                      const signup = signupsData?.signups?.find(s => s.playerId === player.id);
                      if (!signup) return null;
                      const isLastStarter = currentStarters === 1;
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
                                {!isStartersLimitReached && <SelectItem value="STARTER">Titolare</SelectItem>}
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
                    {signupsData?.signups?.filter((s: any) => s.status === 'NEXT' && s.reserveTeam === 'DARK').map((signup: any) => {
                      const isSelected = selectedPlayerIds.includes(signup.playerId);
                      const isHovered = hoveredPlayerId === signup.playerId;
                      return (
                        <div
                          key={signup.signupId}
                          className={`border rounded-lg p-3 cursor-pointer transition-all ${
                            isSelected 
                              ? 'border-blueTeam border-2 bg-blueTeam/10' 
                              : isHovered
                              ? 'border-blueTeam/50 border-2'
                              : 'border-gray-200'
                          }`}
                          data-testid={`dark-next-${signup.playerId}`}
                          onMouseEnter={() => handlePlayerHover(signup.playerId)}
                          onMouseLeave={handlePlayerLeave}
                          onClick={() => handlePlayerClick(signup.playerId, 'DARK')}
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
                                {!isStartersLimitReached && <SelectItem value="STARTER">Titolare</SelectItem>}
                                <SelectItem value="RESERVE">Riserva</SelectItem>
                                <SelectItem value="NEXT">Prossimo</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      );
                    })}
                    {!signupsData?.signups?.some((s: any) => s.status === 'NEXT' && s.reserveTeam === 'DARK') && (
                      <p className="text-sm text-muted-foreground italic">Nessuno in attesa</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

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
                  <div className="flex items-start justify-between gap-3">
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
                    <div className="flex flex-col gap-1">
                      <p className="text-xs text-muted-foreground">Aggiungi come</p>
                      <Select
                        value=""
                        onValueChange={(status) => {
                          addPlayerMutation.mutate({
                            playerId: player.id,
                            status: status as 'STARTER' | 'RESERVE' | 'NEXT',
                          });
                        }}
                        disabled={addPlayerMutation.isPending}
                      >
                        <SelectTrigger className="h-9 w-32 text-xs" data-testid={`select-add-player-${player.id}`}>
                          <SelectValue placeholder="Seleziona..." />
                        </SelectTrigger>
                        <SelectContent>
                          {!isStartersLimitReached && <SelectItem value="STARTER">Titolare</SelectItem>}
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

        {availablePlayers.length === 0 && enrolledPlayers.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
            <p className="text-muted-foreground">Nessun giocatore disponibile</p>
          </div>
        )}
      </div>

      {/* Rename Teams Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent data-testid="dialog-rename-teams">
          <DialogHeader>
            <DialogTitle>Rinomina Squadre</DialogTitle>
            <DialogDescription>
              Modifica i nomi delle squadre per questa partita
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="team-light">Squadra Chiara</Label>
              <Input
                id="team-light"
                value={newTeamNameLight}
                onChange={(e) => setNewTeamNameLight(e.target.value)}
                placeholder="Es. Chiari, Bianchi..."
                data-testid="input-team-light"
              />
            </div>
            <div>
              <Label htmlFor="team-dark">Squadra Scura</Label>
              <Input
                id="team-dark"
                value={newTeamNameDark}
                onChange={(e) => setNewTeamNameDark(e.target.value)}
                placeholder="Es. Scuri, Neri..."
                data-testid="input-team-dark"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)} data-testid="button-cancel-rename">
              Annulla
            </Button>
            <Button 
              onClick={() => renameTeamsMutation.mutate({ teamNameLight: newTeamNameLight, teamNameDark: newTeamNameDark })}
              disabled={renameTeamsMutation.isPending || !newTeamNameLight || !newTeamNameDark}
              data-testid="button-confirm-rename"
            >
              {renameTeamsMutation.isPending ? 'Salvataggio...' : 'Salva'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Match Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent data-testid="dialog-delete-match">
          <DialogHeader>
            <DialogTitle>Elimina Partita</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare questa partita? Questa azione non può essere annullata.
              Tutti i giocatori iscritti e le configurazioni delle squadre saranno rimossi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} data-testid="button-cancel-delete">
              Annulla
            </Button>
            <Button 
              variant="destructive"
              onClick={() => deleteMatchMutation.mutate()}
              disabled={deleteMatchMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMatchMutation.isPending ? 'Eliminazione...' : 'Elimina'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
