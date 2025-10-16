import { type Sport } from '@shared/schema';

interface Player {
  id: string;
  name: string;
}

interface FieldViewProps {
  sport: Sport;
  lightStarters: Player[];
  darkStarters: Player[];
  reservesLight: Player[];
  reservesDark: Player[];
}

export default function FieldView({ 
  sport, 
  lightStarters, 
  darkStarters, 
  reservesLight, 
  reservesDark 
}: FieldViewProps) {
  const getSportLabel = (sport: Sport) => {
    switch (sport) {
      case 'THREE': return '3v3';
      case 'FIVE': return '5v5';
      case 'EIGHT': return '8v8';
      case 'ELEVEN': return '11v11';
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-card-border bg-card p-6" data-testid="field-view">
        <h3 className="text-lg font-semibold mb-4">Campo {getSportLabel(sport)}</h3>
        
        {/* Campo da gioco */}
        <div className="relative bg-green-700 rounded-lg p-8 min-h-[400px]" style={{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            rgba(255,255,255,0.1) 0px,
            transparent 1px,
            transparent 40px,
            rgba(255,255,255,0.1) 41px
          ),
          repeating-linear-gradient(
            90deg,
            rgba(255,255,255,0.1) 0px,
            transparent 1px,
            transparent 60px,
            rgba(255,255,255,0.1) 61px
          )`
        }}>
          {/* Linea centrale */}
          <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/30" />
          
          {/* Cerchio centrale */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-white/30 rounded-full" />
          
          {/* Squadra Chiara (sinistra) */}
          <div className="absolute top-1/2 left-8 -translate-y-1/2">
            <div className="space-y-3">
              {lightStarters.map((player, idx) => (
                <div
                  key={player.id}
                  className="bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg text-xs font-medium text-green-900 shadow-lg whitespace-nowrap"
                  data-testid={`player-light-${player.id}`}
                >
                  {player.name || `Giocatore ${idx + 1}`}
                </div>
              ))}
            </div>
          </div>
          
          {/* Squadra Scura (destra) */}
          <div className="absolute top-1/2 right-8 -translate-y-1/2">
            <div className="space-y-3">
              {darkStarters.map((player, idx) => (
                <div
                  key={player.id}
                  className="bg-blueTeam/90 backdrop-blur-sm px-3 py-2 rounded-lg text-xs font-medium text-white shadow-lg whitespace-nowrap"
                  data-testid={`player-dark-${player.id}`}
                >
                  {player.name || `Giocatore ${idx + 1}`}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Riserve */}
      {(reservesLight.length > 0 || reservesDark.length > 0) && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-card-border bg-card p-6">
            <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Riserve Chiari</h4>
            <div className="space-y-2">
              {reservesLight.length > 0 ? (
                reservesLight.map((player) => (
                  <div
                    key={player.id}
                    className="px-3 py-2 rounded-lg bg-muted text-sm"
                    data-testid={`reserve-light-${player.id}`}
                  >
                    {player.name}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground italic">Nessuna riserva</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-card-border bg-card p-6">
            <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Riserve Scuri</h4>
            <div className="space-y-2">
              {reservesDark.length > 0 ? (
                reservesDark.map((player) => (
                  <div
                    key={player.id}
                    className="px-3 py-2 rounded-lg bg-muted text-sm"
                    data-testid={`reserve-dark-${player.id}`}
                  >
                    {player.name}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground italic">Nessuna riserva</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
