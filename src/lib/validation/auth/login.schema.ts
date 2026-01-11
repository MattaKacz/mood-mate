import { z } from "zod";

/**
 * Schemat walidacji dla komendy logowania.
 */
export const loginSchema = z.object({
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
});

export type LoginSchemaType = z.infer<typeof loginSchema>;
