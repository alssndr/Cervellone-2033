import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
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

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
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
                  {match.sport}
                </div>
              </div>
            </div>

            {me && (
              <div className="bg-white rounded-lg border border-gray-200 px-4 py-2">
                <p className="text-xs text-muted-foreground">Il tuo ruolo</p>
                <p className="text-sm font-semibold" data-testid="text-my-status">
                  {me.status === 'STARTER' ? 'Titolare' : me.status === 'RESERVE' ? 'Riserva' : 'Prossimo'}
                </p>
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
      </div>
    </div>
  );
}
