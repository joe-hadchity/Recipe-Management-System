export default function TextInput({ id, className = "", ...props }) {
  return (
    <input
      id={id}
      className={`w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-800 transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100 ${className}`}
      {...props}
    />
  );
}
