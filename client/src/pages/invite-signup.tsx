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

type SignupStep = 'phone' | 'profile' | 'completed';

export default function InviteSignup({ params }: InviteSignupProps) {
  const { token } = params;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [step, setStep] = useState<SignupStep>('phone');
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
  const [playerName, setPlayerName] = useState('');

  const { data: inviteData, isLoading } = useQuery<{ ok: boolean; match?: any; error?: string }>({
    queryKey: [`/api/invite/${token}`],
  });

  const checkPhoneMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      const response = await apiRequest('POST', `/api/invite/${token}/check-phone`, { phone: phoneNumber });
      return await response.json();
    },
    onSuccess: (result) => {
      if (!result.ok) {
        toast({
          title: 'Errore',
          description: result.error || 'Errore durante la verifica',
          variant: 'destructive',
        });
        return;
      }

      if (result.alreadyEnrolled) {
        // Already enrolled - save phone and redirect to match page
        localStorage.setItem('demo_phone', phone);
        toast({
          title: 'Già iscritto',
          description: 'Sei già iscritto a questa partita',
        });
        setTimeout(() => {
          setLocation(`/matches/${result.matchId}`);
        }, 1500);
        return;
      }

      if (result.playerExists) {
        // Player exists - signup directly
        setPlayerName(result.playerName);
        signupMutation.mutate({ 
          phone: normalizeE164(phone), 
          name: '',
          surname: '',
          choice, 
          suggestedRatings: null 
        });
      } else {
        // New player - show profile form
        setStep('profile');
      }
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: { phone: string; name: string; surname: string; choice: string; suggestedRatings: any }) => {
      const response = await apiRequest('POST', `/api/invite/${token}/signup`, data);
      return await response.json();
    },
    onSuccess: (result) => {
      if (result.ok) {
        setStep('completed');
        // Save phone for match view
        localStorage.setItem('demo_phone', phone);
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

  const handlePhoneSubmit = () => {
    if (!phone.trim()) {
      toast({
        title: 'Numero mancante',
        description: 'Inserisci il tuo numero di telefono',
        variant: 'destructive',
      });
      return;
    }

    checkPhoneMutation.mutate(phone);
  };

  const handleProfileSubmit = () => {
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

  if (step === 'completed') {
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

        {/* Step 1: Phone + Choice */}
        {step === 'phone' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8">
            <h2 className="text-lg font-semibold mb-6">Iscrizione rapida</h2>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="phone">Numero di telefono</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+39 333 1234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handlePhoneSubmit()}
                  data-testid="input-phone"
                />
              </div>

              <div className="space-y-2">
                <Label>Disponibilità</Label>
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    type="button"
                    variant={choice === 'STARTER' ? 'default' : 'outline'}
                    onClick={() => setChoice('STARTER')}
                    className="w-full"
                    data-testid="button-choice-starter"
                  >
                    Titolare
                  </Button>
                  <Button
                    type="button"
                    variant={choice === 'RESERVE' ? 'default' : 'outline'}
                    onClick={() => setChoice('RESERVE')}
                    className="w-full"
                    data-testid="button-choice-reserve"
                  >
                    Riserva
                  </Button>
                  <Button
                    type="button"
                    variant={choice === 'NEXT' ? 'default' : 'outline'}
                    onClick={() => setChoice('NEXT')}
                    className="w-full"
                    data-testid="button-choice-next"
                  >
                    Prossima
                  </Button>
                </div>
              </div>

              <Button 
                onClick={handlePhoneSubmit} 
                className="w-full"
                disabled={checkPhoneMutation.isPending || signupMutation.isPending}
                data-testid="button-continue"
              >
                {checkPhoneMutation.isPending || signupMutation.isPending ? 'Caricamento...' : 'Continua'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Profile (only if new player) */}
        {step === 'profile' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8">
            <h2 className="text-lg font-semibold mb-6">Crea la tua scheda giocatore</h2>
            
            <div className="space-y-6">
              {/* Personal Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Mario"
                    data-testid="input-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="surname">Cognome</Label>
                  <Input
                    id="surname"
                    value={surname}
                    onChange={(e) => setSurname(e.target.value)}
                    placeholder="Rossi"
                    data-testid="input-surname"
                  />
                </div>
              </div>

              {/* Ratings */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Autovalutazione parametri tecnici</h3>
                <p className="text-xs text-muted-foreground">
                  Valuta le tue capacità da 1 (principiante) a 5 (esperto)
                </p>
                
                {AXES.map((axis) => (
                  <div key={axis} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">{AXIS_LABELS_IT[axis]}</Label>
                      <span className="text-sm font-semibold text-blueTeam">
                        {ratings[axis]}
                      </span>
                    </div>
                    <Slider
                      min={1}
                      max={5}
                      step={1}
                      value={[ratings[axis]]}
                      onValueChange={([value]) => setRatings(prev => ({ ...prev, [axis]: value }))}
                      data-testid={`slider-${axis}`}
                    />
                  </div>
                ))}
              </div>

              <Button 
                onClick={handleProfileSubmit} 
                className="w-full"
                disabled={signupMutation.isPending}
                data-testid="button-complete-signup"
              >
                {signupMutation.isPending ? 'Registrazione...' : 'Completa iscrizione'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
