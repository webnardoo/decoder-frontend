'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function getParam(params: URLSearchParams | null, key: string): string | null {
  if (!params) return null;
  const v = params.get(key);
  return v && v.trim() ? v.trim() : null;
}

export default function ResetPasswordClient() {
  const router = useRouter();
  const params = useSearchParams();

  const token = useMemo(() => {
    // suporta ?token=... ou ?t=...
    return getParam(params, 'token') ?? getParam(params, 't');
  }, [params]);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (!token) {
      setMsg('Link inválido: token ausente.');
      return;
    }
    if (!password || password.length < 6) {
      setMsg('Senha fraca (mínimo 6 caracteres).');
      return;
    }
    if (password !== confirm) {
      setMsg('As senhas não conferem.');
      return;
    }

    setLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
      const res = await fetch(`${apiBase}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const m =
          (data && (data.message || data.error || data?.error?.message)) ||
          'Falha ao redefinir senha.';
        setMsg(String(m));
        return;
      }

      setMsg('Senha alterada com sucesso. Você já pode entrar.');
      setTimeout(() => router.push('/login'), 900);
    } catch (err: any) {
      setMsg(err?.message ? String(err.message) : 'Erro de rede.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/60 p-6 shadow-xl">
        <h1 className="text-xl font-semibold text-white">Redefinir senha</h1>

        {!token ? (
          <p className="mt-3 text-sm text-white/70">
            Link inválido: token ausente.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-5 space-y-3">
            <div>
              <label className="text-sm text-white/70">Nova senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white outline-none"
                placeholder="mín. 6 caracteres"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="text-sm text-white/70">Confirmar senha</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white outline-none"
                placeholder="repita a senha"
                autoComplete="new-password"
              />
            </div>

            {msg ? <p className="text-sm text-white/80">{msg}</p> : null}

            <button
              type="submit"
              disabled={loading || !token}
              className="w-full rounded-xl bg-white text-black py-2 font-medium disabled:opacity-60"
            >
              {loading ? 'Salvando…' : 'Salvar nova senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
