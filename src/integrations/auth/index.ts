import { createLovableAuth } from "@lovable.dev/cloud-auth-js";
import { supabase } from "../supabase/client";

// Clean wrapper helper for third-party/federated authentication providers
const internalAuth = createLovableAuth();

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

export const cloudAuth = {
  auth: {
    signInWithOAuth: async (provider: "google" | "apple" | "microsoft", opts?: SignInOptions) => {
      const result = await internalAuth.signInWithOAuth(provider as any, {
        redirect_uri: opts?.redirect_uri,
        extraParams: {
          ...opts?.extraParams,
        },
      });

      if (result.redirected) {
        return result;
      }

      if (result.error) {
        return result;
      }

      try {
        await supabase.auth.setSession(result.tokens);
      } catch (e) {
        return { error: e instanceof Error ? e : new Error(String(e)) };
      }
      return result;
    },
  },
};
