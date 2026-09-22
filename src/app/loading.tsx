export default function Loading() {
  return <main className="shell loading-shell" aria-busy="true" aria-label="Carregando catálogo"><p role="status" className="sr-only">Carregando catálogo…</p><div className="skeleton loading-title"/><div className="product-grid">{Array.from({length:8},(_,i)=><div key={i} className="skeleton loading-card"/>)}</div></main>;
}
