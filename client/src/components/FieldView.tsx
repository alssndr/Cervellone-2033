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

interface Position {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
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

  const getPlayerPositions = (sport: Sport, team: 'light' | 'dark', playerCount: number): Position[] => {
    if (sport === 'THREE') {
      // 3v3: Formazione triangolare
      // Portiere in basso, 1 giocatore in alto, 1 giocatore al centro
      if (team === 'light') {
        return [
          { bottom: '15%', left: '8%' },      // Portiere
          { top: '20%', left: '20%' },         // Attaccante
          { top: '45%', left: '20%' },         // Centrocampista
        ];
      } else {
        return [
          { bottom: '15%', right: '8%' },     // Portiere
          { top: '20%', right: '20%' },        // Attaccante
          { top: '45%', right: '20%' },        // Centrocampista
        ];
      }
    } else if (sport === 'FIVE') {
      // 5v5: Formazione 2-2-1
      // Portiere laterale, 2 difensori, 2 centrocampisti, 1 attaccante
      if (team === 'light') {
        return [
          { bottom: '20%', left: '5%' },       // Portiere
          { bottom: '35%', left: '18%' },      // Difensore 1
          { bottom: '35%', left: '28%' },      // Difensore 2
          { top: '38%', left: '20%' },         // Centrocampista 1
          { top: '38%', left: '30%' },         // Centrocampista 2
        ].slice(0, playerCount);
      } else {
        return [
          { bottom: '20%', right: '5%' },      // Portiere
          { bottom: '35%', right: '18%' },     // Difensore 1
          { bottom: '35%', right: '28%' },     // Difensore 2
          { top: '38%', right: '20%' },        // Centrocampista 1
          { top: '38%', right: '30%' },        // Centrocampista 2
        ].slice(0, playerCount);
      }
    } else if (sport === 'EIGHT') {
      // 8v8: Formazione 3-3-2
      if (team === 'light') {
        return [
          { bottom: '10%', left: '5%' },       // Portiere
          { bottom: '25%', left: '15%' },      // Difensore 1
          { bottom: '25%', left: '25%' },      // Difensore 2
          { bottom: '25%', left: '35%' },      // Difensore 3
          { top: '50%', left: '15%' },         // Centrocampista 1
          { top: '50%', left: '25%' },         // Centrocampista 2
          { top: '50%', left: '35%' },         // Centrocampista 3
          { top: '20%', left: '25%' },         // Attaccante 1
        ].slice(0, playerCount);
      } else {
        return [
          { bottom: '10%', right: '5%' },      // Portiere
          { bottom: '25%', right: '15%' },     // Difensore 1
          { bottom: '25%', right: '25%' },     // Difensore 2
          { bottom: '25%', right: '35%' },     // Difensore 3
          { top: '50%', right: '15%' },        // Centrocampista 1
          { top: '50%', right: '25%' },        // Centrocampista 2
          { top: '50%', right: '35%' },        // Centrocampista 3
          { top: '20%', right: '25%' },        // Attaccante 1
        ].slice(0, playerCount);
      }
    } else {
      // 11v11: Formazione 4-4-2
      if (team === 'light') {
        return [
          { bottom: '8%', left: '5%' },        // Portiere
          { bottom: '20%', left: '12%' },      // Difensore 1
          { bottom: '20%', left: '22%' },      // Difensore 2
          { bottom: '20%', left: '32%' },      // Difensore 3
          { bottom: '20%', left: '42%' },      // Difensore 4
          { top: '50%', left: '12%' },         // Centrocampista 1
          { top: '50%', left: '22%' },         // Centrocampista 2
          { top: '50%', left: '32%' },         // Centrocampista 3
          { top: '50%', left: '42%' },         // Centrocampista 4
          { top: '20%', left: '20%' },         // Attaccante 1
          { top: '20%', left: '35%' },         // Attaccante 2
        ].slice(0, playerCount);
      } else {
        return [
          { bottom: '8%', right: '5%' },       // Portiere
          { bottom: '20%', right: '12%' },     // Difensore 1
          { bottom: '20%', right: '22%' },     // Difensore 2
          { bottom: '20%', right: '32%' },     // Difensore 3
          { bottom: '20%', right: '42%' },     // Difensore 4
          { top: '50%', right: '12%' },        // Centrocampista 1
          { top: '50%', right: '22%' },        // Centrocampista 2
          { top: '50%', right: '32%' },        // Centrocampista 3
          { top: '50%', right: '42%' },        // Centrocampista 4
          { top: '20%', right: '20%' },        // Attaccante 1
          { top: '20%', right: '35%' },        // Attaccante 2
        ].slice(0, playerCount);
      }
    }
  };

  const lightPositions = getPlayerPositions(sport, 'light', lightStarters.length);
  const darkPositions = getPlayerPositions(sport, 'dark', darkStarters.length);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-card-border bg-card p-6" data-testid="field-view">
        {/* Campo da gioco */}
        <div className="relative bg-green-700 rounded-lg p-8 min-h-[500px]" style={{
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
          {lightStarters.map((player, idx) => {
            const position = lightPositions[idx] || { top: '50%', left: '8%' };
            return (
              <div
                key={player.id}
                className="absolute backdrop-blur-sm px-3 py-2 rounded-lg text-xs font-medium text-white shadow-lg whitespace-nowrap -translate-x-1/2 -translate-y-1/2"
                style={{ 
                  backgroundColor: 'rgba(252, 15, 192, 0.9)',
                  ...position
                }}
                data-testid={`player-light-${player.id}`}
              >
                {player.name || `Giocatore ${idx + 1}`}
              </div>
            );
          })}
          
          {/* Squadra Scura (destra) */}
          {darkStarters.map((player, idx) => {
            const position = darkPositions[idx] || { top: '50%', right: '8%' };
            return (
              <div
                key={player.id}
                className="absolute backdrop-blur-sm px-3 py-2 rounded-lg text-xs font-medium text-white shadow-lg whitespace-nowrap -translate-x-1/2 -translate-y-1/2"
                style={{ 
                  backgroundColor: 'rgba(0, 0, 255, 0.9)',
                  ...position
                }}
                data-testid={`player-dark-${player.id}`}
              >
                {player.name || `Giocatore ${idx + 1}`}
              </div>
            );
          })}
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
