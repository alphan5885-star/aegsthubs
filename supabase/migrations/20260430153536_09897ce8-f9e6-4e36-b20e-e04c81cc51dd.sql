
DROP VIEW IF EXISTS public.vendor_reputation;
CREATE VIEW public.vendor_reputation
WITH (security_invoker = true) AS
SELECT
  p.user_id AS vendor_id,
  p.display_name,
  COALESCE(AVG(r.rating)::numeric(3,2), 0) AS avg_rating,
  COUNT(DISTINCT r.id) AS total_ratings,
  COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'completed') AS completed_orders
FROM public.profiles p
LEFT JOIN public.vendor_ratings r ON r.vendor_id = p.user_id
LEFT JOIN public.orders o ON o.vendor_id = p.user_id
GROUP BY p.user_id, p.display_name;
GRANT SELECT ON public.vendor_reputation TO authenticated;
