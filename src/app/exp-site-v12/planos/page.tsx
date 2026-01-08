import Link from "next/link";

export default function PlanosPage() {
  return (
    <main className="hero" style={{ minHeight: "100vh" }}>
      <div className="container">
        <header className="nav">
          <div className="navLeft">
            <span className="dot" aria-hidden="true" />
            <span className="brandline">Hitch.ai</span>
          </div>
          <nav className="navRight">
            <Link className="navLink" href="/exp-site-v12/login">
              Entrar
            </Link>
            <Link className="btnGhost" href="/exp-site-v12/register">
              Começar a degustação
            </Link>
          </nav>
        </header>

        <section className="section" style={{ paddingTop: 24 }}>
          <div className="block">
            <div className="kicker">PLANOS</div>
            <h1 className="h1" style={{ marginTop: 12 }}>
              Standard, Pro e Unlimited.
            </h1>
            <p className="p" style={{ maxWidth: "72ch" }}>
              Nesta versão experimental, esta página é placeholder. Depois você liga com o fluxo real do app.
            </p>

            <div style={{ marginTop: 18, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link className="btnGhost" href="/exp-site-v12">
                Voltar ao site
              </Link>
              <Link className="btn" href="/exp-site-v12/register">
                Iniciar degustação
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
