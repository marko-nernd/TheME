export function tarEntryHeader(name:string,size:number){
 if(name.length>99||name.startsWith("/")||name.split("/").includes(".."))throw new Error("Unsafe archive filename");
 const header=Buffer.alloc(512);header.write(name,0,100);header.write("0000600\0",100,8);header.write("0000000\0",108,8);header.write("0000000\0",116,8);header.write(size.toString(8).padStart(11,"0")+"\0",124,12);header.write(Math.floor(Date.now()/1000).toString(8).padStart(11,"0")+"\0",136,12);header.fill(32,148,156);header.write("0",156);header.write("ustar\0",257,6);header.write("00",263,2);const checksum=header.reduce((sum,byte)=>sum+byte,0);header.write(checksum.toString(8).padStart(6,"0")+"\0 ",148,8);return header;
}
export async function* tarArchive(files:AsyncIterable<{name:string;data:Buffer}>){for await(const file of files){yield tarEntryHeader(file.name,file.data.length);yield file.data;const padding=(512-file.data.length%512)%512;if(padding)yield Buffer.alloc(padding);}yield Buffer.alloc(1024);}
