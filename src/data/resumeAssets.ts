import { createAssetResolver } from '@/lib/assetResolver'

const shotUrls = import.meta.glob('../assets/shots/*.{svg,png,jpg,jpeg,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const avatarUrls = import.meta.glob('../assets/avatars/*.{svg,png,jpg,jpeg,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const iconUrls = import.meta.glob('../assets/icons/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const documentUrls = import.meta.glob('../assets/documents/*.pdf', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

export const resolveShot = createAssetResolver(shotUrls, 'src/assets/shots')
export const resolveAvatar = createAssetResolver(avatarUrls, 'src/assets/avatars')
export const resolveIcon = createAssetResolver(iconUrls, 'src/assets/icons')
export const resolveDocument = createAssetResolver(documentUrls, 'src/assets/documents')
