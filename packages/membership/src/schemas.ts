import { z } from 'zod';

export const membershipSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters").max(50),
  lastName: z.string().min(2, "Last name must be at least 2 characters").max(50),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(8, "Phone number must be at least 8 characters").max(20),
  password: z.string().min(8, "Password must be at least 8 characters"),
  dateOfBirth: z.string().refine((date) => {
    return !isNaN(Date.parse(date));
  }, { message: "Please provide a valid date" }),
  cityDistrict: z.string().min(2, "City/District is required").max(100),
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: "You must accept the terms and conditions" }),
  }),
  privacyAccepted: z.literal(true, {
    errorMap: () => ({ message: "You must accept the privacy policy" }),
  }),
  marketingConsent: z.boolean().optional(),
});

export type MembershipFormData = z.infer<typeof membershipSchema>;
