import { createClient } from '@supabase/supabase-js';

export const KHE_BUCKET = 'khe-exams-private';
export const KHE_API = 'https://taiqsfrzlehwohthjaew.supabase.co/functions/v1/khe-link-access';
// Public browser identifier only. Never put server secret or private tokens in this file.
export const KHE_PUBLIC_KEY = 'sb_publishable_O6JPcwy7fliKU-LdMsjkHA_LgPT3_xs';
export const supabase = createClient('https://taiqsfrzlehwohthjaew.supabase.co', KHE_PUBLIC_KEY, {auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
export async function familyApi(action, token, params={}) {
 const resp=await fetch(KHE_API, {method:'POST',headers:{'Content-Type':'application/json','apikey':KHE_PUBLIC_KEY},body:JSON.stringify({action,token,...params}),cache:'no-store',referrerPolicy:'no-referrer'});
 const data=await resp.json().catch(()=>({error:'invalid_server_reply'}));
 if(!resp.ok)throw new Error(data.error||'요청 처리에 실패했습니다.');
 return data;
}
