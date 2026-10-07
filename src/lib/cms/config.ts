/* Where the admin finds the CMS API and Supabase Auth. All three values are public by design (the
   publishable key only identifies the project; access is enforced by sign-in and by the CMS API),
   so they have defaults for this project. Override them per environment in Vercel if needed. */
export const CMS_API_URL = (process.env.NEXT_PUBLIC_CMS_API_URL || 'https://hotel-manakamana.onrender.com').replace(/\/+$/, '');
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rtusjzvbkuwktjxammda.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_5S56eow6sFh-Zsis9rV3Xg_IpgIj8_t';
