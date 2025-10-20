import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, MapPinIcon, UserIcon } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const sportLabels: Record<string, string> = {
  THREE: '3v3',
  FIVE: '5v5',
  EIGHT: '8v8',
  ELEVEN: '11v11',
};

const statusLabels: Record<string, string> = {
  STARTER: 'Titolare',
  RESERVE: 'Riserva',
  NEXT: 'Prossima volta',
};

const statusColors: Record<string, 'default' | 'secondary' | 'outline'> = {
  STARTER: 'default',
  RESERVE: 'secondary',
  NEXT: 'outline',
};

export default function UserMatches() {
  const [, setLocation] = useLocation();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/user/matches'],
  });

  const matches = data?.matches || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <p className="text-inkMuted">Caricamento...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Errore</CardTitle>
            <CardDescription>
              Si è verificato un errore nel caricamento delle partite.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation('/user/login')} variant="outline">
              Torna al login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-4xl mx-auto p-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-ink mb-2" data-testid="text-page-title">
              Le mie partite
            </h1>
            <p className="text-inkMuted">
              Partite alle quali sei iscritto
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => {
              localStorage.removeItem('user_token');
              setLocation('/user/login');
            }}
            data-testid="button-logout"
          >
            Esci
          </Button>
        </div>

        {matches.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <UserIcon className="w-12 h-12 mx-auto mb-4 text-inkMuted" />
              <p className="text-inkMuted mb-4">
                Non sei iscritto a nessuna partita al momento
              </p>
              <p className="text-xs text-inkMuted">
                Chiedi all'admin di inviarti un link di invito per iscriverti a una partita
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4" data-testid="container-matches-list">
            {matches.map((match: any) => (
              <Card 
                key={match.id} 
                className="hover-elevate cursor-pointer transition-all"
                onClick={() => setLocation(`/user/matches/${match.id}`)}
                data-testid={`card-match-${match.id}`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" data-testid={`badge-sport-${match.id}`}>
                          {sportLabels[match.sport] || match.sport}
                        </Badge>
                        <Badge variant={statusColors[match.myStatus]} data-testid={`badge-status-${match.id}`}>
                          {statusLabels[match.myStatus] || match.myStatus}
                        </Badge>
                      </div>
                      <CardTitle className="text-xl">
                        {match.location || 'Partita'}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2 text-sm text-inkMuted">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4" />
                      <span data-testid={`text-date-${match.id}`}>
                        {format(new Date(match.dateTime), "d MMMM yyyy 'alle' HH:mm", { locale: it })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPinIcon className="w-4 h-4" />
                      <span data-testid={`text-location-${match.id}`}>
                        {match.location}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
