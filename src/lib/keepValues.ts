import { startTransition, type FormEvent } from "react";

/**
 * Submit a form to a useActionState action without React 19's automatic form reset.
 * With <form action={...}>, React clears every field after the action runs, even when it
 * returns an error, so people lose what they typed (and chosen files). Use as onSubmit instead.
 */
export function keepValues(action: (fd: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  };
}
