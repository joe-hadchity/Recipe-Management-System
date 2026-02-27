import Link from "next/link";
import FieldLabel from "@/components/ui/FieldLabel";
import PrimaryButton from "@/components/ui/PrimaryButton";
import TextInput from "@/components/ui/TextInput";
import { loginAction } from "../actions";

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;

  return (
    <section className="card-soft mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-2xl font-semibold text-slate-800">Login</h1>
      <p className="text-sm text-slate-500">Welcome back. Sign in to continue planning meals.</p>
      {params?.error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{params.error}</p> : null}
      <form action={loginAction} className="space-y-3">
        <div>
          <FieldLabel htmlFor="login-email" required>
            Email
          </FieldLabel>
          <TextInput id="login-email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
        </div>
        <div>
          <FieldLabel htmlFor="login-password" required>
            Password
          </FieldLabel>
          <TextInput id="login-password" name="password" type="password" required autoComplete="current-password" placeholder="Enter password" />
        </div>
        <PrimaryButton type="submit" className="w-full">
          Sign In
        </PrimaryButton>
      </form>
      <p className="text-sm text-slate-600">
        No account?{" "}
        <Link className="text-violet-700 underline" href="/signup">
          Create one
        </Link>
      </p>
    </section>
  );
}
