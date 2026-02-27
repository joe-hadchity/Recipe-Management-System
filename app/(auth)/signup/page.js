import Link from "next/link";
import FieldLabel from "@/components/ui/FieldLabel";
import PrimaryButton from "@/components/ui/PrimaryButton";
import TextInput from "@/components/ui/TextInput";
import { signupAction } from "../actions";

export default async function SignupPage({ searchParams }) {
  const params = await searchParams;

  return (
    <section className="card-soft mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-2xl font-semibold text-slate-800">Create account</h1>
      <p className="text-sm text-slate-500">Start building your recipe library and nutrition goals.</p>
      {params?.error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{params.error}</p> : null}
      <form action={signupAction} className="space-y-3">
        <div>
          <FieldLabel htmlFor="signup-email" required>
            Email
          </FieldLabel>
          <TextInput id="signup-email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
        </div>
        <div>
          <FieldLabel htmlFor="signup-password" required>
            Password
          </FieldLabel>
          <TextInput id="signup-password" name="password" type="password" required autoComplete="new-password" placeholder="Create password" />
        </div>
        <PrimaryButton type="submit" className="w-full">
          Sign Up
        </PrimaryButton>
      </form>
      <p className="text-sm text-slate-600">
        Already have an account?{" "}
        <Link className="text-violet-700 underline" href="/login">
          Login
        </Link>
      </p>
    </section>
  );
}
