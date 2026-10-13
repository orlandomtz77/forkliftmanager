-- SYNTHETIC LOCAL DEVELOPMENT DATA ONLY. Never run against production.
-- Creates two test users (password: Password123!):
--   admin@example.test       -> role admin
--   technician@example.test  -> role technician

do $$
declare
  v_admin_id uuid := '00000000-0000-4000-8000-000000000001';
  v_tech_id  uuid := '00000000-0000-4000-8000-000000000002';
  v_user record;
begin
  for v_user in
    select * from (values
      (v_admin_id, 'admin@example.test', 'Admin de Prueba'),
      (v_tech_id, 'technician@example.test', 'Técnico de Prueba')
    ) as t(id, email, full_name)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', v_user.id, 'authenticated', 'authenticated',
      v_user.email, extensions.crypt('Password123!', extensions.gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}',
      jsonb_build_object('full_name', v_user.full_name),
      now(), now(), '', '', '', ''
    );

    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_user.id, v_user.id::text,
      jsonb_build_object('sub', v_user.id::text, 'email', v_user.email, 'email_verified', true),
      'email', now(), now(), now()
    );
  end loop;

  update public.profiles set role = 'admin' where id = v_admin_id;
end;
$$;
