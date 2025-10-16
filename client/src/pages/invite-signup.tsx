import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { normalizeE164, AXIS_LABELS_IT, type AxisKey, AXES } from '@shared/schema';
import { CheckCircle2, Calendar, MapPin, Users } from 'lucide-react';

interface InviteSignupProps {
  params: { token: string };
}

export default function InviteSignup({ params }: InviteSignupProps) {
  const { token } = params;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [choice, setChoice] = useState<'STARTER' | 'RESERVE' | 'NEXT'>('STARTER');
  const [ratings, setRatings] = useState({
    defense: 3,
    attack: 3,
    speed: 3,
    power: 3,
    technique: 3,
    shot: 3,
  });
  const [completed, setCompleted] = useState(false);

  const { data: inviteData, isLoading } = useQuery<{ ok: boolean; match?: any; error?: string }>({
    queryKey: [`/api/invite/${token}`],
  });

  const signupMutation = useMutation({
    mutationFn: async (data: { phone: string; name: string; surname: string; choice: string; suggestedRatings: any }) => {
      const response = await apiRequest('POST', `/api/invite/${token}/signup`, data);
      return await response.json();
    },
    onSuccess: (result) => {
      if (result.ok) {
        setCompleted(true);
        toast({
          title: 'Iscrizione completata!',
          description: 'Sei stato registrato alla partita',
        });
        setTimeout(() => {
          setLocation(`/matches/${result.matchId}`);
        }, 2000);
      } else {
        toast({
          title: 'Errore',
          description: result.error || 'Impossibile completare l\'iscrizione',
          variant: 'destructive',
        });
      }
    },
  });

  const handleSignup = () => {
    if (!phone.trim()) {
      toast({
        title: 'Numero mancante',
        description: 'Inserisci il tuo numero di telefono',
        variant: 'destructive',
      });
      return;
    }

    if (!name.trim() || !surname.trim()) {
      toast({
        title: 'Dati incompleti',
        description: 'Inserisci nome e cognome',
        variant: 'destructive',
      });
      return;
    }

    const normalized = normalizeE164(phone);
    signupMutation.mutate({ 
      phone: normalized, 
      name: name.trim(),
      surname: surname.trim(),
      choice, 
      suggestedRatings: ratings 
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blueTeam mb-4"></div>
          <p className="text-inkMuted">Caricamento invito...</p>
        </div>
      </div>
    );
  }

  if (!inviteData?.ok || !inviteData?.match) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-red-200 p-8">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Invito non valido</h2>
          <p className="text-sm text-muted-foreground">
            {inviteData?.error || 'Questo link di invito non è valido o è scaduto'}
          </p>
        </div>
      </div>
    );
  }

  const { match } = inviteData;

  if (completed) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-green-200 p-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-green-600 mb-2">Iscrizione completata!</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Sei stato registrato alla partita
          </p>
          <p className="text-xs text-inkMuted">
            Reindirizzamento alla pagina della partita...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Match Info */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-6">
          <h1 className="text-2xl font-bold text-ink mb-4" data-testid="text-invite-title">
            Sei stato invitato a una partita!
          </h1>
          
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 text-inkMuted">
              <Users className="w-5 h-5" />
              <span>{match.sport === 'THREE' ? '3v3' : match.sport === 'FIVE' ? '5v5' : match.sport === 'EIGHT' ? '8v8' : '11v11'}</span>
            </div>
            <div className="flex items-center gap-3 text-inkMuted">
              <Calendar className="w-5 h-5" />
              <span>{new Date(match.dateTime).toLocaleString('it-IT')}</span>
            </div>
            <div className="flex items-center gap-3 text-inkMuted">
              <MapPin className="w-5 h-5" />
              <span>{match.location}</span>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <span className="font-semibold">Posti titolari rimasti:</span> {match.startersLeft}
            </p>
          </div>
        </div>

        {/* Signup Form */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <h2 className="text-lg font-semibold mb-6">Completa la tua iscrizione</h2>
          
          <div className="space-y-6">
            {/* Personal Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Mario"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  data-testid="input-name-signup"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="surname">Cognome</Label>
                <Input
                  id="surname"
                  type="text"
                  placeholder="Rossi"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  data-testid="input-surname-signup"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Numero di Telefono</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+39 333 1234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                data-testid="input-phone-signup"
              />
            </div>

            {/* Rating Sliders */}
            <div className="space-y-4 pt-4 border-t">
              <div>
                <h3 className="text-sm font-semibold mb-2">Auto-valutazione abilità</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Valuta le tue abilità da 1 (minimo) a 5 (massimo). Questo aiuterà a bilanciare meglio le squadre.
                </p>
              </div>

              {AXES.map((axis) => (
                <div key={axis} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor={`rating-${axis}`} className="text-sm">
                      {AXIS_LABELS_IT[axis as AxisKey]}
                    </Label>
                    <span className="text-sm font-semibold text-blueTeam" data-testid={`text-rating-${axis}`}>
                      {ratings[axis as keyof typeof ratings]}
                    </span>
                  </div>
                  <Slider
                    id={`rating-${axis}`}
                    min={1}
                    max={5}
                    step={1}
                    value={[ratings[axis as keyof typeof ratings]]}
                    onValueChange={(value) => setRatings(prev => ({ ...prev, [axis]: value[0] }))}
                    data-testid={`slider-rating-${axis}`}
                  />
                </div>
              ))}
            </div>

            {/* Availability Choice */}
            <div className="space-y-3 pt-4 border-t">
              <Label>Disponibilità</Label>
              
              <div className="grid gap-3">
                <button
                  onClick={() => setChoice('STARTER')}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    choice === 'STARTER' 
                      ? 'border-blueTeam bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  data-testid="button-choice-starter"
                >
                  <div className="font-medium mb-1">Voglio giocare come titolare</div>
                  <div className="text-sm text-muted-foreground">
                    Sarò assegnato a una squadra (se ci sono posti disponibili)
                  </div>
                </button>

                <button
                  onClick={() => setChoice('RESERVE')}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    choice === 'RESERVE' 
                      ? 'border-blueTeam bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  data-testid="button-choice-reserve"
                >
                  <div className="font-medium mb-1">Voglio essere una riserva</div>
                  <div className="text-sm text-muted-foreground">
                    Entrerò se qualcuno si ritira
                  </div>
                </button>

                <button
                  onClick={() => setChoice('NEXT')}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    choice === 'NEXT' 
                      ? 'border-blueTeam bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  data-testid="button-choice-next"
                >
                  <div className="font-medium mb-1">Prossima volta</div>
                  <div className="text-sm text-muted-foreground">
                    Non posso partecipare a questa partita
                  </div>
                </button>
              </div>
            </div>

            <Button
              onClick={handleSignup}
              disabled={signupMutation.isPending}
              className="w-full"
              size="lg"
              data-testid="button-submit-signup"
            >
              {signupMutation.isPending ? 'Iscrizione in corso...' : 'Conferma Iscrizione'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
