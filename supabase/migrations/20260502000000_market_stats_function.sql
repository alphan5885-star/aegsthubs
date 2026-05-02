-- Market Stats API function for real-time data
CREATE OR REPLACE FUNCTION public.get_market_stats()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  result jsonb;
  orders_24h numeric := 0;
  volume_24h numeric := 0;
  active_users numeric := 0;
  active_vendors numeric := 0;
  total_products numeric := 0;
BEGIN
  -- Orders in last 24h
  SELECT COUNT(*)::numeric INTO orders_24h
  FROM orders
  WHERE created_at > NOW() - INTERVAL '24 hours'
    AND status IN ('paid', 'shipped', 'delivered', 'completed');

  -- Volume in last 24h (sum of amounts)
  SELECT COALESCE(SUM(amount), 0)::numeric INTO volume_24h
  FROM transactions
  WHERE created_at > NOW() - INTERVAL '24 hours'
    AND type IN ('purchase', 'sale')
    AND amount > 0;

  -- Active users (any role, logged in within 24h or has active order)
  SELECT COUNT(DISTINCT user_id)::numeric INTO active_users
  FROM profiles p
  WHERE EXISTS (
    SELECT 1 FROM sessions s WHERE s.user_id = p.user_id AND s.expires_at > NOW()
  )
  OR EXISTS (
    SELECT 1 FROM orders o 
    WHERE o.buyer_id = p.user_id 
    AND o.status IN ('paid', 'shipped')
  )
  OR EXISTS (
    SELECT 1 FROM orders o 
    WHERE o.vendor_id = p.user_id 
    AND o.status IN ('paid', 'shipped')
  );

  -- Active vendors (has products with stock > 0)
  SELECT COUNT(DISTINCT vendor_id)::numeric INTO active_vendors
  FROM products
  WHERE stock > 0 AND status = 'active';

  -- Total active products
  SELECT COUNT(*)::numeric INTO total_products
  FROM products
  WHERE stock > 0 AND status = 'active';

  result := jsonb_build_object(
    'orders24h', orders_24h,
    'volume24h', ROUND(volume_24h, 4),
    'online', active_users,
    'activeVendors', active_vendors,
    'totalProducts', total_products
  );

  RETURN result;
END;
$$;
