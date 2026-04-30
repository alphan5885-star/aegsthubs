
REVOKE EXECUTE ON FUNCTION public.redeem_admin_invite(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.bootstrap_first_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.panic_destroy() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.release_escrow(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.process_order_payment(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.confirm_delivery(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.assign_role_on_signup(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.generate_payment_address(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.record_login_attempt(text, boolean, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_vendor_rating(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_account_locked(text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.redeem_admin_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_first_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.panic_destroy() TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_escrow(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_order_payment(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_delivery(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_role_on_signup(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_payment_address(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_login_attempt(text, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_vendor_rating(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_account_locked(text) TO authenticated;
