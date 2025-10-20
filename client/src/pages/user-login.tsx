import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export default function UserLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!phone.trim()) {
      toast({
        title: 'Errore',
        description: 'Inserisci un numero di telefono',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest('POST', '/api/user/login', { phone });
      const result = await response.json();
      
      if (result.ok && result.token) {
        localStorage.setItem('user_token', result.token);
        toast({
          title: 'Accesso effettuato',
          description: 'Benvenuto!',
        });
        setLocation('/user/matches');
      } else {
        toast({
          title: 'Errore',
          description: result.error || 'Login fallito',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Errore',
        description: 'Si è verificato un errore durante il login',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-ink mb-2" data-testid="text-login-title">
              Accedi alle tue partite
            </h1>
            <p className="text-sm text-inkMuted">
              Accedi con il tuo numero di telefono per vedere le partite alle quali sei iscritto
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Numero di Telefono</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+39 333 1234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                data-testid="input-phone"
              />
              <p className="text-xs text-muted-foreground">
                Inserisci il numero di telefono che hai usato per iscriverti alle partite
              </p>
            </div>

            <Button
              className="w-full"
              onClick={handleLogin}
              disabled={loading}
              data-testid="button-login"
            >
              {loading ? 'Accesso in corso...' : 'Accedi'}
            </Button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-center text-inkMuted">
              L'autenticazione è basata sul riconoscimento del numero di telefono
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
