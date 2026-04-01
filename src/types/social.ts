export interface SocialAccountSafe {
  id: string;
  platform: 'meta' | 'linkedin' | 'tiktok' | 'pinterest';
  account_name: string | null;
  page_name: string | null;
  page_id: string | null;
  scopes: string[];
  connected_at: string;
  expires_at: string | null;
  isExpired: boolean;
}
