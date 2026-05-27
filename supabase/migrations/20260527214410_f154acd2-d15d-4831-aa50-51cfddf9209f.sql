-- Revoke client-side UPDATE/DELETE on subscriptions; only service_role may modify.
REVOKE UPDATE, DELETE ON public.subscriptions FROM authenticated;
REVOKE UPDATE, DELETE ON public.subscriptions FROM anon;

-- Ensure service_role retains full access for server-side webhook/admin updates.
GRANT ALL ON public.subscriptions TO service_role;

-- Explicit deny policies for authenticated role (defense in depth alongside revoked grants).
DROP POLICY IF EXISTS "no client update subscription" ON public.subscriptions;
CREATE POLICY "no client update subscription"
ON public.subscriptions
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS "no client delete subscription" ON public.subscriptions;
CREATE POLICY "no client delete subscription"
ON public.subscriptions
FOR DELETE
TO authenticated
USING (false);
