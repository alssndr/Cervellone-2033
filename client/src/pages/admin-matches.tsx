import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { type Sport, type Match } from '@shared/schema';
import { Calendar, MapPin, Users, Plus, ExternalLink, Shuffle, Check } from 'lucide-react';

interface LineupVariant {
  id: string;
  ordinal: number;
  algo: string;
  score: number;
  recommended: boolean;
  light: string[];
  dark: string[];
}

export default function AdminMatches() {
  const { toast } = useToast();
  const [, setRoute] = useLocation();
  const [sport, setSport] = useState<Sport>('FIVE');
  const [dateTime, setDateTime] = useState('');
  const [location, setLocation] = useState('Campo Sportivo');
  const [selectedMatchForVariants, setSelectedMatchForVariants] = useState<string | null>(null);

  const { data: matches, isLoading } = useQuery<{ ok: boolean; items: (Match & { inviteUrl: string })[] }>({
    queryKey: ['/api/admin/matches'],
  });

  const { data: variantsData, isLoading: loadingVariants } = useQuery<{ ok: boolean; variants: LineupVariant[] }>({
    queryKey: ['/api/admin/matches', selectedMatchForVariants, 'lineups'],
    enabled: !!selectedMatchForVariants,
  });

  const createMatchMutation = useMutation({
    mutationFn: async (data: { sport: Sport; dateTime: string; location: string }) => {
      const response = await apiRequest('POST', '/api/admin/matches', data);
      return await response.json();
    },
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/matches'] });
        toast({
          title: 'Partita creata!',
          description: `Usa il pulsante "Copia Invito" per condividere`,
        });
        setDateTime('');
        setLocation('Campo Sportivo');
      } else {
        toast({
          title: 'Errore',
          description: result.error || 'Impossibile creare la partita',
          variant: 'destructive',
        });
      }
    },
  });

  const generateVariantsMutation = useMutation({
    mutationFn: async (matchId: string) => {
      const response = await apiRequest('POST', `/api/admin/matches/${matchId}/generate-lineups`, { count: 5 });
      return await response.json();
    },
    onSuccess: (result, matchId) => {
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/matches', matchId, 'lineups'] });
        toast({
          title: 'Varianti generate!',
          description: `${result.count} varianti create`,
        });
        setSelectedMatchForVariants(matchId);
      }
    },
  });

  const applyVariantMutation = useMutation({
    mutationFn: async ({ matchId, lineupVersionId }: { matchId: string; lineupVersionId: string }) => {
      const response = await apiRequest('POST', `/api/admin/matches/${matchId}/apply-lineup`, { lineupVersionId });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/matches'] });
      toast({
        title: 'Variante applicata!',
        description: 'Le squadre sono state aggiornate',
      });
      setSelectedMatchForVariants(null);
    },
  });

  const handleCreateMatch = () => {
    if (!dateTime || !location.trim()) {
      toast({
        title: 'Campi mancanti',
        description: 'Compila tutti i campi richiesti',
        variant: 'destructive',
      });
      return;
    }
    createMatchMutation.mutate({ sport, dateTime, location });
  };

  const getSportLabel = (sport: Sport) => {
    switch (sport) {
      case 'THREE': return '3v3';
      case 'FIVE': return '5v5';
      case 'EIGHT': return '8v8';
      case 'ELEVEN': return '11v11';
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      OPEN: 'bg-green-100 text-green-800',
      FROZEN: 'bg-yellow-100 text-yellow-800',
      CLOSED: 'bg-gray-100 text-gray-800',
    };
    return badges[status as keyof typeof badges] || badges.OPEN;
  };

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-ink mb-2" data-testid="text-matches-title">
              Gestione Partite
            </h1>
            <p className="text-inkMuted">Crea e gestisci le partite sportive</p>
          </div>
          <Link href="/admin/players">
            <Button variant="outline">
              <Users className="w-4 h-4 mr-2" />
              Gestione Giocatori
            </Button>
          </Link>
        </div>

        {/* Create Match Form */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Crea Nuova Partita
          </h2>
          
          <div className="grid md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sport">Sport</Label>
              <Select value={sport} onValueChange={(value) => setSport(value as Sport)}>
                <SelectTrigger id="sport" data-testid="select-sport">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="THREE">3v3 (6 giocatori)</SelectItem>
                  <SelectItem value="FIVE">5v5 (10 giocatori)</SelectItem>
                  <SelectItem value="EIGHT">8v8 (16 giocatori)</SelectItem>
                  <SelectItem value="ELEVEN">11v11 (22 giocatori)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="datetime">Data e Ora</Label>
              <Input
                id="datetime"
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                data-testid="input-datetime"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Luogo</Label>
              <Input
                id="location"
                type="text"
                placeholder="Es: Campo Sportivo"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                data-testid="input-location"
              />
            </div>

            <div className="flex items-end">
              <Button
                onClick={handleCreateMatch}
                disabled={createMatchMutation.isPending}
                className="w-full"
                data-testid="button-create-match"
              >
                {createMatchMutation.isPending ? 'Creazione...' : 'Crea Partita'}
              </Button>
            </div>
          </div>
        </div>

        {/* Matches List */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Partite</h2>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blueTeam"></div>
              <p className="mt-4">Caricamento partite...</p>
            </div>
          ) : !matches?.items || matches.items.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nessuna partita creata</p>
              <p className="text-sm mt-2">Crea la tua prima partita usando il modulo sopra</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {matches.items.map((match: Match & { id: string; status: string }) => (
                <div
                  key={match.id}
                  className="p-6 hover:bg-gray-50 transition-colors"
                  data-testid={`match-${match.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-lg font-semibold">
                          {getSportLabel(match.sport)}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(match.status)}`}>
                          {match.status}
                        </span>
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
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => generateVariantsMutation.mutate(match.id)}
                        disabled={generateVariantsMutation.isPending}
                        data-testid={`button-generate-variants-${match.id}`}
                      >
                        <Shuffle className="w-4 h-4 mr-2" />
                        Genera Varianti
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const inviteUrl = (match as any).inviteUrl;
                          if (inviteUrl) {
                            navigator.clipboard.writeText(inviteUrl);
                            toast({ title: 'Link copiato!', description: 'Invito copiato negli appunti' });
                          }
                        }}
                        data-testid={`button-copy-invite-${match.id}`}
                      >
                        Copia Invito
                      </Button>
                      <Link href={`/matches/${match.id}`}>
                        <Button variant="outline" size="sm" data-testid={`button-view-${match.id}`}>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Visualizza
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Variants Dialog */}
      <Dialog open={!!selectedMatchForVariants} onOpenChange={(open) => !open && setSelectedMatchForVariants(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Scegli Variante Squadre</DialogTitle>
          </DialogHeader>

          {loadingVariants ? (
            <div className="py-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blueTeam"></div>
              <p className="mt-4 text-muted-foreground">Caricamento varianti...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {variantsData?.variants.map((variant, idx) => (
                <div
                  key={variant.id}
                  className="border rounded-lg p-4"
                  data-testid={`variant-${variant.id}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">Variante #{variant.ordinal + 1}</span>
                      <Badge variant={variant.algo === 'GREEDY_LOCAL' ? 'default' : 'secondary'}>
                        {variant.algo === 'GREEDY_LOCAL' ? 'Algoritmo Greedy' : 'Random'}
                      </Badge>
                      {variant.recommended && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <Check className="w-3 h-3 mr-1" />
                          Raccomandata
                        </Badge>
                      )}
                      <span className="text-sm text-muted-foreground">
                        Score: {variant.score.toFixed(2)}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => applyVariantMutation.mutate({ 
                        matchId: selectedMatchForVariants!, 
                        lineupVersionId: variant.id 
                      })}
                      disabled={applyVariantMutation.isPending}
                      data-testid={`button-apply-variant-${variant.id}`}
                    >
                      Applica
                    </Button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-sm mb-2">Squadra Chiara</h4>
                      <div className="bg-gray-50 rounded p-3 space-y-1">
                        {variant.light.map((name, i) => (
                          <div key={i} className="text-sm">{name}</div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-2">Squadra Scura</h4>
                      <div className="bg-gray-50 rounded p-3 space-y-1">
                        {variant.dark.map((name, i) => (
                          <div key={i} className="text-sm">{name}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
