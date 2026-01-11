import { z } from "zod";

/**
 * Schemat walidacji dla komendy rejestracji użytkownika.
 *
 * Wymaga:
 * - Poprawnego adresu email (RFC, znormalizowany do lowercase)
 * - Hasła min. 8 znaków (zalecane 12+ z cyfrą i symbolem)
 * - Akceptacji regulaminu (acceptTerms = true)
 * - Potwierdzenia pełnoletności (confirmAdult = true)
 * - Opcjonalnego pominięcia FTUE (skipFtue, domyślnie false)
 */
export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: "Nieprawidłowy format adresu email" })
    .max(255, { message: "Email nie może być dłuższy niż 255 znaków" }),

  password: z
    .string()
    .min(8, { message: "Hasło musi zawierać co najmniej 8 znaków" })
    .max(128, { message: "Hasło nie może być dłuższe niż 128 znaków" }),

  acceptTerms: z.boolean().refine((val) => val === true, {
    message: "Musisz zaakceptować regulamin, aby się zarejestrować",
  }),

  confirmAdult: z.boolean().refine((val) => val === true, {
    message: "Musisz potwierdzić, że jesteś pełnoletni/a",
  }),

  skipFtue: z.boolean().optional().default(false),
});

export type RegisterSchemaType = z.infer<typeof registerSchema>;
