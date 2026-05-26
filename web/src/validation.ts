import { z } from "zod";

// Mirrors the server schema for fast client-side feedback. Server stays authoritative.
export const registerFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Invalid email"),
  mobile: z.string().trim().regex(/^0\d{9}$/, "Mobile must be 10 digits starting with 0"),
  postcode: z.string().trim().regex(/^\d{4}$/, "Postcode must be 4 digits"),
  suburb: z.string().trim().min(1, "Suburb is required").max(80),
  services: z.array(z.string()).min(1, "Select at least one service"),
});

export type RegisterForm = z.infer<typeof registerFormSchema>;
