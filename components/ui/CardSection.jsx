export default function CardSection({ title, description, children, className = "" }) {
  return (
    <section className={`card-soft p-5 ${className}`}>
      {title ? <h2 className="text-base font-semibold text-slate-800">{title}</h2> : null}
      {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      <div className={title || description ? "mt-4" : ""}>{children}</div>
    </section>
  );
}
