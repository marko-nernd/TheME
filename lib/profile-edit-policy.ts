export function profileEditCharge(used: number, balance: number, nameChanged: boolean, urlChanged: boolean) {
 if(!nameChanged&&!urlChanged)return {freeChange:false,credits:0};
 if(used<3)return {freeChange:true,credits:0};
 const credits=urlChanged?3:1;
 if(balance<credits)throw new Error(`PROFILE_CREDITS_REQUIRED:${credits}`);
 return {freeChange:false,credits};
}
