import { Linking } from 'react-native';
import { useStore } from '@/store';

/** Opens a tel: / sms: link, with a friendly message if the device cannot. */
export function useOpen() {
  const { showToast, t } = useStore();
  return (url: string) => Linking.openURL(url).catch(() => showToast(t('common.cantOpen')));
}
