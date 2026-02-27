const STATUS_META = {
  favorite: { label: "Favorite", className: "bg-amber-100 text-amber-800" },
  to_try: { label: "To Try", className: "bg-sky-100 text-sky-800" },
  made_before: { label: "Made Before", className: "bg-emerald-100 text-emerald-800" }
};

export default function RecipeStatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: "Uncategorized", className: "bg-slate-100 text-slate-700" };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${meta.className}`}>{meta.label}</span>;
}
