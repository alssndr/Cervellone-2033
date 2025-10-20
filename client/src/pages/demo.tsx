import { Link } from 'wouter';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Demo() {
  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-ink mb-4">Come Funziona</h1>
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
                  Dopo aver cliccato sul link, i signori giocatori sono invitati a inserire il proprio numero di telefono: quel numero di telefono sarà associato alla propria scheda statistica. Il giocatore può proporre la propria scheda al momento dell'iscrizione; la scheda deve essere validata dal Cervellone in persona.
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
                <h3 className="text-lg font-semibold mb-2">Giochi?</h3>
                <p className="text-inkMuted mb-3">
                  Ogni giocatore può scegliere tra:
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-sm">•</span>
                    <span className="text-sm"><strong>Titolare:</strong> vieni schierato automaticamente in campo</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-sm">•</span>
                    <span className="text-sm"><strong>Riserva:</strong> ti impegni a sostituire un altro signor giocatore in caso di rinuncia</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-sm">•</span>
                    <span className="text-sm"><strong>Prossima volta:</strong> dritto nella lista prioritaria per la partita successiva</span>
                  </li>
                </ul>
                <p className="text-xs text-inkMuted italic mt-3">
                  * Il funzionamento dello stato "prossima volta" va ancora descritto, progettato e programmato.
                </p>
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
                  L'algoritmo greedy Cervello 2.0™ + local search divide i giocatori in due squadre bilanciate basandosi su 6 parametri:
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                  <div className="px-3 py-2 bg-blue-50 rounded-lg">① Difesa</div>
                  <div className="px-3 py-2 bg-blue-50 rounded-lg">② Attacco</div>
                  <div className="px-3 py-2 bg-blue-50 rounded-lg">③ Velocità</div>
                  <div className="px-3 py-2 bg-blue-50 rounded-lg">④ Tecnica</div>
                  <div className="px-3 py-2 bg-blue-50 rounded-lg">⑤ Stato di forma</div>
                  <div className="px-3 py-2 bg-blue-50 rounded-lg">⑥ Tiro</div>
                </div>
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
