import { NextResponse } from "next/server";

export const dynamic="force-dynamic";

export async function GET(){
  return NextResponse.json({
    ok:true,
    source:{
      id:"littlecat-vn",
      name:"LittleCat.vn",
      baseUrl:"https://littlecat.vn",
      mode:"metadata-deeplink",
      rightsStatus:"unverified",
      enabled:true,
      capabilities:[
        {id:"guides",label:"Hướng dẫn học",url:"https://littlecat.vn/guides/"},
        {id:"voice-acting",label:"Lồng tiếng / luyện nói",url:"https://littlecat.vn/guides/voice-acting-guide.html"},
        {id:"book-reading",label:"Đọc sách / story reading",url:"https://littlecat.vn/guides/book-reading-guide.html"},
        {id:"typing",label:"Luyện gõ phím",url:"https://littlecat.vn/typing"}
      ],
      policy:"Link and metadata only until reuse/API rights are confirmed. Do not copy protected text, audio, video or images into HomeSchooling without permission."
    }
  });
}