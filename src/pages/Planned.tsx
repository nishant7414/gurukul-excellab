export default function Planned({ title, what }: { title: string; what: string }) {
  return (
    <div className="page">
      <header><h1>{title}</h1></header>
      <div className="callout warn"><strong>Planned, not yet built.</strong> {what}</div>
    </div>
  );
}
