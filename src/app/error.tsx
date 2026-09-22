"use client";
import Link from "next/link";
export default function ErrorPage({ retry }: { retry: () => void }) {
  return <main className="error-shell"><h1>Não foi possível carregar esta página.</h1><p>Verifique sua conexão e tente novamente. Se o problema continuar, volte em alguns instantes.</p><button className="button-primary" onClick={retry}>Tentar novamente</button><Link className="button-text" href="/">Voltar ao catálogo</Link></main>;
}
