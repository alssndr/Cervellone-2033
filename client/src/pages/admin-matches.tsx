import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { type Sport, type Match } from '@shared/schema';
import { Calendar, MapPin, Users, Plus, ExternalLink } from 'lucide-react';

export default function AdminMatches() {
  const { toast } = useToast();
  const [, setLocation_nav] = useLocation();
  const [sport, setSport] = useState<Sport>('THREE');
  const [dateTime, setDateTime] = useState('');
  const [location, setLocation] = useState('Da definire');

  // Set default datetime to 24 hours from now
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setHours(tomorrow.getHours() + 24);
    const formattedDateTime = tomorrow.toISOString().slice(0, 16);
    setDateTime(formattedDateTime);
  }, []);

  const { data: matches, isLoading } = useQuery<{ ok: boolean; items: (Match & { inviteUrl: string })[] }>({
    queryKey: ['/api/admin/matches'],
  });

  const createMatchMutation = useMutation({
    mutationFn: async (data: { sport: Sport; dateTime: string; location: string }) => {
      const response = await apiRequest('POST', '/api/admin/matches', data);
      return await response.json();
    },
    onSuccess: (result) => {
      if (result.ok && result.matchId) {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/matches'] });
        toast({
          title: 'Partita creata!',
          description: `Reindirizzamento alla gestione partita...`,
        });
        // Auto-redirect to match detail page
        setTimeout(() => {
          setLocation_nav(`/admin/matches/${result.matchId}`);
        }, 500);
      } else {
        toast({
          title: 'Errore',
          description: result.error || 'Impossibile creare la partita',
          variant: 'destructive',
        });
      }
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
                placeholder="Es: Campo da calcetto"
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
                      <Link href={`/admin/matches/${match.id}`}>
                        <Button variant="outline" size="sm" data-testid={`button-view-${match.id}`}>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Gestisci
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
    </div>
  );
}
