export default function SecondaryButton({ className = "", type = "button", children, ...props }) {
  return (
    <button
      type={type}
      className={`rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
