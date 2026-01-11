import { useEffect } from "react";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";

export function useFocusOnFirstError<TFieldValues extends FieldValues>(form: UseFormReturn<TFieldValues>) {
  const {
    formState: { errors, submitCount },
    setFocus,
  } = form;

  useEffect(() => {
    if (!submitCount || !errors) {
      return;
    }

    const firstErrorKey = Object.keys(errors)[0] as Path<TFieldValues> | undefined;
    if (!firstErrorKey) {
      return;
    }

    setFocus(firstErrorKey);
  }, [errors, submitCount, setFocus]);
}
