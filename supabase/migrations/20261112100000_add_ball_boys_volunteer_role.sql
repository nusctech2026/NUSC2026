BEGIN;

INSERT INTO public.campaign_roles (category, name, code, description) VALUES
  ('volunteer', 'Ball Boys', 'vol_ball_boys', 'Assist with matchday ball retrieval and distribution')
ON CONFLICT (code) DO NOTHING;

COMMIT;
