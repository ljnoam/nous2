[
  {
    "function_name": "check_couple_members_limit",
    "definition": "CREATE OR REPLACE FUNCTION public.check_couple_members_limit()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nbegin\r\n  if (select count(*) from couple_members where couple_id = new.couple_id) >= 2 then\r\n    raise exception 'Ce couple est déjà complet (maximum 2 membres)';\r\n  end if;\r\n  return new;\r\nend;\r\n$function$\n"
  },
  {
    "function_name": "create_couple",
    "definition": "CREATE OR REPLACE FUNCTION public.create_couple(p_started_at date)\n RETURNS TABLE(couple_id uuid, join_code text)\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\r\ndeclare\r\n  uid uuid := auth.uid();\r\n  new_cpl uuid;\r\n  code text;\r\nbegin\r\n  if uid is null then\r\n    raise exception 'Non authentifié';\r\n  end if;\r\n\r\n  if exists (select 1 from public.couple_members cm where cm.user_id = uid) then\r\n    raise exception 'Déjà dans un couple';\r\n  end if;\r\n\r\n  code := upper(substr(md5(gen_random_uuid()::text), 1, 6));\r\n\r\n  insert into public.couples(id, join_code, started_at, created_by)\r\n  values (gen_random_uuid(), code, p_started_at, uid)\r\n  returning id into new_cpl;\r\n\r\n  insert into public.couple_members(user_id, couple_id)\r\n  values (uid, new_cpl);\r\n\r\n  return query select new_cpl as couple_id, code as join_code;\r\nend;\r\n$function$\n"
  },
  {
    "function_name": "enforce_max_two_members",
    "definition": "CREATE OR REPLACE FUNCTION public.enforce_max_two_members()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\ndeclare cnt int;\r\nbegin\r\n  select count(*) into cnt\r\n  from public.couple_members cm\r\n  where cm.couple_id = NEW.couple_id;\r\n\r\n  if cnt >= 2 then\r\n    raise exception 'Ce couple a déjà 2 membres';\r\n  end if;\r\n\r\n  return NEW;\r\nend;\r\n$function$\n"
  },
  {
    "function_name": "ensure_max_two_members",
    "definition": "CREATE OR REPLACE FUNCTION public.ensure_max_two_members()\n RETURNS trigger\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\r\ndeclare\r\n  member_count int;\r\nbegin\r\n  select count(*) into member_count\r\n  from public.couple_members\r\n  where couple_id = new.couple_id;\r\n\r\n  if member_count >= 2 then\r\n    raise exception 'Ce couple a déjà 2 membres.';\r\n  end if;\r\n\r\n  return new;\r\nend;\r\n$function$\n"
  },
  {
    "function_name": "gen_join_code",
    "definition": "CREATE OR REPLACE FUNCTION public.gen_join_code()\n RETURNS text\n LANGUAGE plpgsql\nAS $function$\r\ndeclare\r\n  code text;\r\nbegin\r\n  loop\r\n    -- code court, lisible, 6 chars\r\n    code := upper(substr(md5(gen_random_uuid()::text), 1, 6));\r\n    exit when not exists (select 1 from public.couples where join_code = code);\r\n  end loop;\r\n  return code;\r\nend;\r\n$function$\n"
  },
  {
    "function_name": "handle_new_user",
    "definition": "CREATE OR REPLACE FUNCTION public.handle_new_user()\n RETURNS trigger\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\r\nbegin\r\n  insert into public.profiles (id, created_at, display_name)\r\n  values (new.id, now(), split_part(new.email, '@', 1))\r\n  on conflict (id) do nothing;\r\n  return new;\r\nend;\r\n$function$\n"
  },
  {
    "function_name": "is_member_of_couple",
    "definition": "CREATE OR REPLACE FUNCTION public.is_member_of_couple(_couple_id uuid)\n RETURNS boolean\n LANGUAGE sql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\r\n  select exists (\r\n    select 1\r\n    from public.couple_members\r\n    where couple_id = _couple_id\r\n      and user_id   = auth.uid()\r\n  );\r\n$function$\n"
  },
  {
    "function_name": "join_couple",
    "definition": "CREATE OR REPLACE FUNCTION public.join_couple(p_join_code text)\n RETURNS TABLE(couple_id uuid)\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\r\ndeclare\r\n  uid uuid := auth.uid();\r\n  target uuid;\r\n  members int;\r\nbegin\r\n  if uid is null then\r\n    raise exception 'Non authentifié';\r\n  end if;\r\n\r\n  if exists (select 1 from public.couple_members cm where cm.user_id = uid) then\r\n    raise exception 'Déjà dans un couple';\r\n  end if;\r\n\r\n  select c.id into target\r\n  from public.couples c\r\n  where c.join_code = upper(p_join_code);\r\n\r\n  if target is null then\r\n    raise exception 'Code invalide';\r\n  end if;\r\n\r\n  select count(*) into members\r\n  from public.couple_members cm\r\n  where cm.couple_id = target;\r\n\r\n  if members >= 2 then\r\n    raise exception 'Ce couple est complet';\r\n  end if;\r\n\r\n  insert into public.couple_members(user_id, couple_id)\r\n  values (uid, target);\r\n\r\n  return query select target as couple_id;\r\nend;\r\n$function$\n"
  }
]