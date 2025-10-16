import { Link } from 'wouter';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Demo() {
  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-ink mb-4">Come Funziona</h1>
          <p className="text-xl text-inkMuted">
            Il sistema di bilanciamento squadre in 4 semplici passaggi
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-8 mb-12">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blueTeam text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">L'admin crea una partita</h3>
                <p className="text-inkMuted">
                  Seleziona lo sport (3v3, 5v5, 8v8, 11v11), data, ora e luogo della partita.
                  Il sistema genera automaticamente un link di invito tokenizzato.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blueTeam text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">I giocatori ricevono il link</h3>
                <p className="text-inkMuted">
                  Cliccando sul link, i giocatori accedono alla pagina di iscrizione.
                  Basta inserire il numero di telefono - il sistema riconosce automaticamente il giocatore.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blueTeam text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Scelta della disponibilità</h3>
                <p className="text-inkMuted mb-3">
                  Ogni giocatore sceglie la propria disponibilità:
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm"><strong>Titolare:</strong> viene assegnato a una squadra</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm"><strong>Riserva:</strong> entra se qualcuno si ritira</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-gray-600" />
                    <span className="text-sm"><strong>Prossima volta:</strong> non può partecipare</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blueTeam text-white rounded-full flex items-center justify-center font-bold">
                4
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Bilanciamento automatico</h3>
                <p className="text-inkMuted mb-3">
                  L'algoritmo greedy + local search divide i giocatori in due squadre bilanciate basandosi su 6 assi:
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                  <div className="px-3 py-2 bg-blue-50 rounded-lg">⚔️ Difesa</div>
                  <div className="px-3 py-2 bg-blue-50 rounded-lg">🎯 Attacco</div>
                  <div className="px-3 py-2 bg-blue-50 rounded-lg">⚡ Velocità</div>
                  <div className="px-3 py-2 bg-blue-50 rounded-lg">💪 Potenza</div>
                  <div className="px-3 py-2 bg-blue-50 rounded-lg">🎨 Tecnica</div>
                  <div className="px-3 py-2 bg-blue-50 rounded-lg">⚽ Tiro</div>
                </div>
                <p className="text-inkMuted mt-3">
                  Il risultato? Due squadre perfettamente bilanciate con un radar chart comparativo!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link href="/admin/login">
            <Button size="lg" className="gap-2" data-testid="button-start">
              Inizia Ora
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
