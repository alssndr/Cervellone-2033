import { type Sport } from '@shared/schema';

interface Player {
  id: string;
  name: string;
  ratings?: {
    defense: number;
    attack: number;
    speed: number;
    power: number;
    technique: number;
    shot: number;
  } | null;
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

  const calculateAverage = (ratings: Player['ratings']): number | null => {
    if (!ratings) return null;
    const values = [ratings.defense, ratings.attack, ratings.speed, ratings.power, ratings.technique, ratings.shot];
    const validValues = values.filter(v => typeof v === 'number' && isFinite(v));
    if (validValues.length === 0) return null;
    const sum = validValues.reduce((acc, val) => acc + val, 0);
    const average = sum / validValues.length;
    return isFinite(average) ? Math.round(average * 10) / 10 : null;
  };

  const getPlayerPositions = (sport: Sport, team: 'light' | 'dark', playerCount: number): Position[] => {
    if (sport === 'THREE') {
      // 3v3: Formazione come nello screenshot
      // Portiere laterale, attaccante alto centrale, centrocampista al centro
      if (team === 'light') {
        return [
          { bottom: '20%', left: '12%' },     // Portiere (sinistra)
          { top: '15%', left: '25%' },        // Attaccante (alto centrale)
          { top: '45%', left: '22%' },        // Centrocampista (centro)
        ];
      } else {
        return [
          { bottom: '20%', right: '12%' },    // Portiere (destra)
          { top: '15%', right: '25%' },       // Attaccante (alto centrale)
          { top: '45%', right: '22%' },       // Centrocampista (centro)
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
        <div className="relative bg-green-700 rounded-lg p-8 min-h-[600px]" style={{
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
          
          {/* Cerchio centrale (30% più grande: da 96px a ~125px) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-white/30 rounded-full" />
          
          {/* Squadra Chiara (sinistra) */}
          {lightStarters.map((player, idx) => {
            const position = lightPositions[idx] || { top: '50%', left: '8%' };
            const average = calculateAverage(player.ratings);
            return (
              <div
                key={player.id}
                className="absolute flex flex-col items-center -translate-x-1/2 -translate-y-1/2"
                style={position}
                data-testid={`player-light-${player.id}`}
              >
                {/* Pallino con media */}
                {average !== null && (
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm mb-1 shadow-lg"
                    style={{ backgroundColor: 'rgba(252, 15, 192, 0.95)' }}
                    data-testid={`rating-light-${player.id}`}
                  >
                    {average.toFixed(1)}
                  </div>
                )}
                {/* Nome giocatore */}
                <div className="backdrop-blur-sm px-3 py-2 rounded-lg text-xs font-medium text-white shadow-lg whitespace-nowrap bg-black/60">
                  {player.name || `Giocatore ${idx + 1}`}
                </div>
              </div>
            );
          })}
          
          {/* Squadra Scura (destra) */}
          {darkStarters.map((player, idx) => {
            const position = darkPositions[idx] || { top: '50%', right: '8%' };
            const average = calculateAverage(player.ratings);
            return (
              <div
                key={player.id}
                className="absolute flex flex-col items-center -translate-x-1/2 -translate-y-1/2"
                style={position}
                data-testid={`player-dark-${player.id}`}
              >
                {/* Pallino con media */}
                {average !== null && (
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm mb-1 shadow-lg"
                    style={{ backgroundColor: 'rgba(0, 0, 255, 0.95)' }}
                    data-testid={`rating-dark-${player.id}`}
                  >
                    {average.toFixed(1)}
                  </div>
                )}
                {/* Nome giocatore */}
                <div className="backdrop-blur-sm px-3 py-2 rounded-lg text-xs font-medium text-white shadow-lg whitespace-nowrap bg-black/60">
                  {player.name || `Giocatore ${idx + 1}`}
                </div>
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
