export default function FormHelpText({ children, isError = false }) {
  return <p className={`mt-1 text-xs ${isError ? "text-rose-600" : "text-slate-500"}`}>{children}</p>;
}
