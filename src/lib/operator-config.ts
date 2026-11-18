// Ascend is open source and meant to be self-hosted by anyone. Impressum and
// Privacy policy content necessarily depends on WHO is running a given
// instance and WHERE - so none of it is hardcoded. Each operator fills these
// in via environment variables before going live; until then, the legal
// pages render a clearly-marked placeholder instead of fake data.
export type OperatorConfig = {
  name: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  isConfigured: boolean;
};

export function getOperatorConfig(): OperatorConfig {
  const name = process.env.OPERATOR_NAME || null;
  const address = process.env.OPERATOR_ADDRESS || null;
  const email = process.env.OPERATOR_EMAIL || null;
  const phone = process.env.OPERATOR_PHONE || null;

  return {
    name,
    address,
    email,
    phone,
    isConfigured: Boolean(name && address && email),
  };
}
