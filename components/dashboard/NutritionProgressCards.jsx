export default function NutritionProgressCards({ summary, targets }) {
  const cards = [
    { key: "calories", label: "Calories", unit: "kcal", icon: "🔥", bar: "bg-rose-500", tint: "bg-rose-50" },
    { key: "protein", label: "Protein", unit: "g", icon: "💪", bar: "bg-blue-500", tint: "bg-blue-50" },
    { key: "carbs", label: "Carbs", unit: "g", icon: "⚡", bar: "bg-amber-500", tint: "bg-amber-50" },
    { key: "fat", label: "Fat", unit: "g", icon: "🥑", bar: "bg-emerald-500", tint: "bg-emerald-50" }
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const value = Number(summary[card.key] || 0);
        const target = Number(targets[card.key] || 0);
        const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
        return (
          <article key={card.key} className={`card-soft p-4 ${card.tint}`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              <span className="mr-1">{card.icon}</span>
              {card.label}
            </p>
            <p className="mt-1 text-xl font-semibold text-slate-900">
              {value} / {target} {card.unit}
            </p>
            <div className="mt-3 h-2.5 rounded-full bg-slate-100">
              <div className={`h-2.5 rounded-full ${card.bar}`} style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-500">{pct}% of daily target</p>
          </article>
        );
      })}
    </div>
  );
}
