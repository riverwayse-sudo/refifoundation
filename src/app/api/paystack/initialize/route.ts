import { NextResponse } from "next/server";

export async function POST(request:Request){
 try{
  const secret=process.env.PAYSTACK_SECRET_KEY;
  if(!secret)return NextResponse.json({error:"PAYSTACK_SECRET_KEY is not configured."},{status:500});
  const body=await request.json(),email=String(body.email||"").trim(),name=String(body.name||"").trim(),amount=Number(body.amount);
  if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return NextResponse.json({error:"A valid email is required."},{status:400});
  if(!Number.isInteger(amount)||amount<100)return NextResponse.json({error:"Donation amount must be at least ₦100."},{status:400});
  const origin=new URL(request.url).origin;
  const reference="refi-"+Date.now()+"-"+crypto.randomUUID().replace(/-/g,"").slice(0,12);
  const payload={email,amount:String(amount*100),currency:"NGN",reference,callback_url:origin+"/donate/success",metadata:{source:String(body.source||"donate"),donor_name:name||null,initiative:"REFI Play for Impact"}};
  const response=await fetch("https://api.paystack.co/transaction/initialize",{method:"POST",headers:{"Authorization":"Bearer "+secret,"Content-Type":"application/json"},body:JSON.stringify(payload),cache:"no-store"});
  const data=await response.json();
  if(!response.ok||!data.status)return NextResponse.json({error:data.message||"Paystack could not initialize the transaction."},{status:502});
  return NextResponse.json({authorizationUrl:data.data.authorization_url,reference:data.data.reference});
 }catch{return NextResponse.json({error:"Unable to initialize payment."},{status:500})}
}