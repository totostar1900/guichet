-- Funds read from the bulletin arrive ready for subscription: visible and distributed.
update offers
   set hidden = false,
       fund = jsonb_set(coalesce(fund, '{}'::jsonb), '{distributed}', 'true'::jsonb)
 where kind = 'FONDS';
