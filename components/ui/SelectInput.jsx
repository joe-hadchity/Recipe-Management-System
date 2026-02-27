export default function SelectInput({ id, className = "", children, ...props }) {
  return (
    <select
      id={id}
      className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-800 shadow-sm transition focus:border-violet-400 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}
