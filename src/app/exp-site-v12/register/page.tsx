import Link from "next/link";

export default function RegisterPage() {
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
            <Link className="navLink" href="/exp-site-v12/login">
              Entrar
            </Link>
          </nav>
        </header>

        <section className="section" style={{ paddingTop: 24 }}>
          <div className="mockCard floating" style={{ width: "min(560px, 100%)", margin: "0 auto" }}>
            <div style={{ padding: 22 }}>
              <div className="kicker">Degustação</div>
              <h1 className="h1" style={{ fontSize: "36px", marginTop: 10 }}>
                Começar agora
              </h1>
              <p className="p" style={{ maxWidth: "unset" }}>
                Fluxo real será conectado ao app. Aqui é placeholder do experimento.
              </p>

              <div style={{ marginTop: 18, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Link className="btnGhost" href="/exp-site-v12">
                  Voltar ao site
                </Link>
                <Link className="btn" href="/exp-site-v12/planos">
                  Ver planos
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
