export interface PageProps {
  me: { email: string; mode: string; role: string; is_admin: boolean } | null;
  refreshMe: () => Promise<unknown>;
}
