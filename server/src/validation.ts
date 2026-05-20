import { z } from "zod";

// AU mobile: 10 digits starting 04, allow spaces. Postcode: 4 digits.
export const registerInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().toLowerCase().email("Invalid email"),
  mobile: z
    .string()
    .trim()
    .regex(/^0\d{9}$/, "Mobile must be 10 digits starting with 0"),
  postcode: z.string().trim().regex(/^\d{4}$/, "Postcode must be 4 digits"),
  services: z.array(z.string().min(1)).min(1, "Select at least one service"),
});

export type RegisterInput = z.infer<typeof registerInputSchema>;
