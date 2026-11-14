import { createHash, timingSafeEqual } from "node:crypto";
export const deletionConfirmation = "DELETE MY ACCOUNT";
export function deletionCodeHash(memberId:string,code:string) {return createHash("sha256").update(`${memberId}:${code}`).digest("hex");}
export function deletionCodeMatches(memberId:string,code:string,hash:string){if(!/^\d{6}$/.test(code)||!/^[a-f0-9]{64}$/.test(hash))return false;return timingSafeEqual(Buffer.from(deletionCodeHash(memberId,code),"hex"),Buffer.from(hash,"hex"));}
