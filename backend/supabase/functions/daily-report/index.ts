// Scheduled server-side function. Configure SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// RESEND_API_KEY, ADMIN_EMAIL, FROM_EMAIL as Edge Function secrets.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
Deno.serve(async () => {
  const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tehran'}).format(new Date(Date.now()-86400000)); // reading day runs Fajr→Fajr (03:01–05:46 Tehran); schedule at 06:00 Tehran to report the day just finished
  const {data,error}=await db.from('daily_reports').select('*').eq('report_date',today).order('group_number').order('participant_id');
  if(error) return new Response(error.message,{status:500});
  const html=`<h2>Daily Quran report ${today}</h2><p>Completed reports: ${data.length}</p>`;
  const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${Deno.env.get('RESEND_API_KEY')}`,'Content-Type':'application/json'},body:JSON.stringify({from:Deno.env.get('FROM_EMAIL'),to:Deno.env.get('ADMIN_EMAIL'),subject:`Daily Quran report ${today}`,html})});
  return new Response(await r.text(),{status:r.status});
});
