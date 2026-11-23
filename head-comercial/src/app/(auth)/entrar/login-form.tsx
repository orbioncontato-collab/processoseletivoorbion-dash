"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "@/modules/auth/actions";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Field } from "@/components/form/field";
import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/form/submit-button";

export function LoginForm() {
  const params = useSearchParams();
  const [state, action] = useActionState(signIn, null);
  const linkError = params.get("erro") === "link";

  return (
    <form action={action} className="grid gap-4" noValidate>
      <input type="hidden" name="next" value={params.get("next") ?? ""} />
      {linkError ? (
        <Alert variant="destructive">
          O link expirou ou já foi usado. Entre com sua senha ou peça um novo link.
        </Alert>
      ) : null}
      <FormMessage state={state} />
      <Field id="email" label="E-mail" errors={state?.fieldErrors?.email}>
        <Input name="email" type="email" autoComplete="email" required autoFocus />
      </Field>
      <Field id="password" label="Senha" errors={state?.fieldErrors?.password}>
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>
      <SubmitButton className="w-full" pendingLabel="Entrando...">
        Entrar
      </SubmitButton>
      <Link href="/recuperar-senha" className="text-center text-sm text-primary hover:underline">
        Esqueci minha senha
      </Link>
    </form>
  );
}
