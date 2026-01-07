import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="hero" style={{ minHeight: "100vh" }}>
      <div className="container">
        <header className="nav">
          <div className="navLeft">
            <span className="dot" aria-hidden="true" />
            <span className="brandline">Hitch.ai</span>
          </div>
          <nav className="navRight">
            <Link className="navLink" href="/exp-site-v12/planos">
              Assinar
            </Link>
            <Link className="btnGhost" href="/exp-site-v12/register">
              Começar a degustação
            </Link>
          </nav>
        </header>

        <section className="section" style={{ paddingTop: 24 }}>
          <div className="mockCard floating" style={{ width: "min(520px, 100%)", margin: "0 auto" }}>
            <div style={{ padding: 22 }}>
              <div className="kicker">Entrar</div>
              <h1 className="h1" style={{ fontSize: "36px", marginTop: 10 }}>
                Acesse sua conta
              </h1>
              <p className="p" style={{ maxWidth: "unset" }}>
                Esta é uma página placeholder do experimento.
              </p>

              <div style={{ marginTop: 18, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Link className="btnGhost" href="/exp-site-v12">
                  Voltar ao site
                </Link>
                <Link className="btn" href="/exp-site-v12/register">
                  Criar conta
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
