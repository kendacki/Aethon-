import { useCallback, useSyncExternalStore } from "react";
import { getAuthToken, subscribeAuth } from "./token";

export function useAuthSession() {
  const token = useSyncExternalStore(
    subscribeAuth,
    () => getAuthToken(),
    () => null,
  );

  const isSignedIn = Boolean(token);

  const getToken = useCallback(() => getAuthToken(), []);

  return { token, isSignedIn, getToken };
}
