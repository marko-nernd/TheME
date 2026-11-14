import { Readable } from "node:stream";
import { createGzip } from "node:zlib";
import { readFile,realpath } from "node:fs/promises";
import path from "node:path";
import { getCurrentMember } from "@/lib/auth";
import { pool } from "@/db";
import { tarArchive } from "@/lib/tar-archive";
import { decryptPrivateDocument } from "@/lib/private-document";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const ext=(mime:string)=>({'image/png':'png','image/webp':'webp','image/jpeg':'jpg','video/mp4':'mp4','image/gif':'gif'}[mime]||'bin');
export async function GET(){
 const member=await getCurrentMember();if(!member?.emailVerifiedAt)return Response.json({error:"Sign in first."},{status:401});
 const client=await pool.connect();
 try{
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const account=(await client.query('SELECT id,name,email,username,primary_role,home_market,bio,website_url,portfolio_url,created_at FROM members WHERE id=$1 AND deleted_at IS NULL',[member.id])).rows[0];
  const assets=(await client.query(`SELECT 'profile/avatar' AS name,avatar_data AS data,avatar_mime AS mime,NULL::text AS path,false AS private FROM members WHERE id=$1 AND avatar_data IS NOT NULL
  UNION ALL SELECT 'profile/social-avatar',social_avatar_data,'image/webp',NULL,false FROM members WHERE id=$1 AND social_avatar_data IS NOT NULL
  UNION ALL SELECT 'profile/cover',cover_data,cover_mime,image_path,false FROM profiles WHERE member_id=$1
  UNION ALL SELECT 'portfolio/'||i.id,i.image_data,i.image_mime,i.image_path,false FROM portfolio_items i JOIN profiles p ON p.id=i.profile_id WHERE p.member_id=$1
  UNION ALL SELECT 'identity/front',front_data,front_mime,NULL,true FROM identity_documents WHERE member_id=$1
  UNION ALL SELECT 'identity/back',back_data,back_mime,NULL,true FROM identity_documents WHERE member_id=$1 AND back_data IS NOT NULL
  UNION ALL SELECT 'identity/selfie',selfie_data,selfie_mime,NULL,true FROM identity_documents WHERE member_id=$1 AND selfie_data IS NOT NULL
  UNION ALL SELECT 'events/'||id||'-media',media_data,media_mime,image_path,false FROM events WHERE owner_id=$1
  UNION ALL SELECT 'events/'||id||'-poster',poster_data,poster_mime,NULL,false FROM events WHERE owner_id=$1 AND poster_data IS NOT NULL
  UNION ALL SELECT 'proposals/'||id||'-media',media_data,media_mime,NULL,false FROM event_proposals WHERE member_id=$1 AND media_data IS NOT NULL
  UNION ALL SELECT 'proposals/'||id||'-poster',poster_data,poster_mime,NULL,false FROM event_proposals WHERE member_id=$1 AND poster_data IS NOT NULL
  UNION ALL SELECT 'sponsors/'||s.id,s.logo_data,s.logo_mime,s.logo_path,false FROM sponsors s JOIN sponsor_members sm ON sm.sponsor_id=s.id WHERE sm.member_id=$1`,[member.id])).rows;
  await client.query('COMMIT');
  const root=await realpath(process.env.MEDIA_LIBRARY_ROOT||path.join(process.cwd(),"public"));
  const files:Array<{name:string;data:Buffer}>=[];
  for(const asset of assets){let data:Buffer|null=asset.data;let mime=asset.mime;
   if(!data&&asset.path?.startsWith('/')){const file=await realpath(path.resolve(root,'.'+asset.path)).catch(()=>null);if(file&&file.startsWith(root+path.sep)){data=await readFile(file);mime=asset.path.endsWith('.png')?'image/png':asset.path.endsWith('.webp')?'image/webp':asset.path.endsWith('.jpg')?'image/jpeg':'application/octet-stream';}}
   if(data){if(asset.private)data=decryptPrivateDocument(data);files.push({name:asset.name+'.'+ext(mime),data});}
  }
  files.unshift({name:'account.json',data:Buffer.from(JSON.stringify({exportedAt:new Date().toISOString(),account,files:files.map(file=>file.name)},null,2))});
  async function* source(){for(const file of files)yield file;}
  const stream=Readable.from(tarArchive(source())).pipe(createGzip());
  return new Response(Readable.toWeb(stream) as ReadableStream,{headers:{'content-type':'application/gzip','content-disposition':'attachment; filename="model-escape-files.tar.gz"','cache-control':'private, no-store','x-content-type-options':'nosniff'}});
 }catch{await client.query('ROLLBACK').catch(()=>{});return Response.json({error:"The archive could not be prepared. Contact support before deleting your account."},{status:503});}finally{client.release();}
}
