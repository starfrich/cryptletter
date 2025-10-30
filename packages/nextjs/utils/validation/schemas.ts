import { z } from "zod";

/**
 * Creator Registration Validation Schema
 */
export const creatorRegistrationSchema = z.object({
  name: z.string().min(1, "Creator name is required").max(50, "Creator name must be 50 characters or less").trim(),
  bio: z.string().min(1, "Bio is required").max(500, "Bio must be 500 characters or less").trim(),
  price: z
    .string()
    .refine(val => !isNaN(Number(val)) && Number(val) > 0, "Price must be a positive number")
    .refine(val => Number(val) >= 0.001, "Minimum price is 0.001 ETH (approximately $3 USD)")
    .refine(val => Number(val) <= 100, "Maximum price is 100 ETH"),
});

export type CreatorRegistrationFormData = z.infer<typeof creatorRegistrationSchema>;

/**
 * Newsletter Content Validation Schema
 */
export const newsletterContentSchema = z.object({
  title: z.string().min(1, "Newsletter title is required").max(200, "Title must be 200 characters or less").trim(),
  contentHtml: z.string().min(1, "Newsletter content is required"),
  contentJson: z.any().nullable().optional(),
});

export type NewsletterContentFormData = z.infer<typeof newsletterContentSchema>;

/**
 * Newsletter Publishing Validation Schema (includes content + options)
 */
export const newsletterPublishSchema = newsletterContentSchema.extend({
  isPublic: z.boolean().default(false),
  author: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
});

export type NewsletterPublishFormData = z.infer<typeof newsletterPublishSchema>;

/**
 * Subscription Price Validation
 */
export const subscriptionPriceSchema = z
  .string()
  .refine(val => !isNaN(Number(val)) && Number(val) > 0, "Invalid price")
  .refine(val => Number(val) >= 0.001, "Minimum price is 0.001 ETH");

/**
 * Ethereum Address Validation
 */
export const ethereumAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address");
