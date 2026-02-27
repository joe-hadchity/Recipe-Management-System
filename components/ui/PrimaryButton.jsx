export default function PrimaryButton({ className = "", type = "button", children, ...props }) {
  return (
    <button
      type={type}
      className={`rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
