import { Link } from 'wouter';
import { Users, Calendar, BarChart3 } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-6xl mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-ink mb-4" data-testid="text-title">
            Cervellone 2.0
          </h1>
          <p className="text-xl text-inkMuted max-w-2xl mx-auto">
            Sofisticato sistema per la gestione del calciotto settimanale
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="w-12 h-12 bg-blueTeam/10 rounded-lg flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-blueTeam" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Gestione Giocatori</h3>
            <p className="text-sm text-inkMuted">
              Valuta i giocatori su 6 parametri: difesa, attacco, velocità, stato di forma, tecnica e tiro
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="w-12 h-12 bg-blueTeam/10 rounded-lg flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6 text-blueTeam" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Bilanciamento Automatico</h3>
            <p className="text-sm text-inkMuted">
              Algoritmo greedy + local search per dividere le squadre equamente
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="w-12 h-12 bg-blueTeam/10 rounded-lg flex items-center justify-center mb-4">
              <Calendar className="w-6 h-6 text-blueTeam" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Inviti Semplici</h3>
            <p className="text-sm text-inkMuted">
              Link tokenizzati per iscrizioni rapide via numero di telefono
            </p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/admin/login">
            <button
              className="px-6 py-3 bg-blueTeam text-white rounded-lg font-medium hover-elevate active-elevate-2 transition-all"
              data-testid="button-admin-login"
            >
              Login Admin
            </button>
          </Link>
          
          <Link href="/demo">
            <button
              className="px-6 py-3 border-2 border-blueTeam text-blueTeam rounded-lg font-medium hover-elevate active-elevate-2 transition-all"
              data-testid="button-demo"
            >
              Vedi Demo
            </button>
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-20 text-center text-sm text-inkMuted">
          {/* TODO: Add logo PNG above this line */}
          <p>Cervello 2.0 is a coffee break project by Studio Dude</p>
        </div>
      </div>
    </div>
  );
}
