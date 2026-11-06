import { router, type Href } from 'expo-router';

/** Leave this screen. If it was opened directly, go to `fallback` instead of a dead back action. */
export function goBack(fallback: Href = '/home') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
