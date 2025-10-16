interface Player {
  id: string;
  name: string;
}

interface TextViewProps {
  lightStarters: Player[];
  darkStarters: Player[];
  reservesLight: Player[];
  reservesDark: Player[];
}

export default function TextView({ 
  lightStarters, 
  darkStarters, 
  reservesLight, 
  reservesDark 
}: TextViewProps) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Squadra Chiara */}
      <div className="rounded-xl border border-card-border bg-card p-6" data-testid="text-view-light">
        <h3 className="text-lg font-semibold mb-4">Squadra Chiara</h3>
        
        <div className="mb-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Titolari</h4>
          <div className="space-y-2">
            {lightStarters.length > 0 ? (
              lightStarters.map((player, idx) => (
                <div
                  key={player.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg bg-background"
                  data-testid={`starter-light-${player.id}`}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                    {idx + 1}
                  </div>
                  <span className="text-sm">{player.name || `Giocatore ${idx + 1}`}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground italic">Nessun titolare</p>
            )}
          </div>
        </div>

        {reservesLight.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Riserve</h4>
            <div className="space-y-2">
              {reservesLight.map((player) => (
                <div
                  key={player.id}
                  className="px-3 py-2 rounded-lg bg-muted text-sm"
                  data-testid={`reserve-text-light-${player.id}`}
                >
                  {player.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Squadra Scura */}
      <div className="rounded-xl border border-card-border bg-card p-6" data-testid="text-view-dark">
        <h3 className="text-lg font-semibold mb-4">Squadra Scura</h3>
        
        <div className="mb-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Titolari</h4>
          <div className="space-y-2">
            {darkStarters.length > 0 ? (
              darkStarters.map((player, idx) => (
                <div
                  key={player.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg bg-background"
                  data-testid={`starter-dark-${player.id}`}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                    {idx + 1}
                  </div>
                  <span className="text-sm">{player.name || `Giocatore ${idx + 1}`}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground italic">Nessun titolare</p>
            )}
          </div>
        </div>

        {reservesDark.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Riserve</h4>
            <div className="space-y-2">
              {reservesDark.map((player) => (
                <div
                  key={player.id}
                  className="px-3 py-2 rounded-lg bg-muted text-sm"
                  data-testid={`reserve-text-dark-${player.id}`}
                >
                  {player.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
