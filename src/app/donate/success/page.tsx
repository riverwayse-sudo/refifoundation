import Link from "next/link";
import { ArrowRight, CheckCircle2, HeartHandshake } from "lucide-react";
import styles from "../../engagement.module.css";
import { SiteFooter, SiteHeader } from "../../_components/site-chrome";

async function verify(reference:string){
 const secret=process.env.PAYSTACK_SECRET_KEY;
 if(!secret)return {ok:false,error:"Payment verification is not configured yet."};
 const res=await fetch("https://api.paystack.co/transaction/verify/"+encodeURIComponent(reference),{headers:{Authorization:"Bearer "+secret},cache:"no-store"});
 const json=await res.json();
 if(!res.ok||!json.status)return {ok:false,error:"We could not verify this payment."};
 const d=json.data;
 return {ok:d.status==="success",amount:d.amount,currency:d.currency,reference:d.reference};
}

export default async function DonationSuccess({searchParams}:{searchParams:Promise<{reference?:string}>}){
 const {reference}=await searchParams;
 const result=reference?await verify(reference):{ok:false,error:"No payment reference was supplied."};
 return <main className={styles.shell}><SiteHeader/><section className={styles.hero}><div className={styles.heroInner}><div className={styles.eyebrow}>REFI · Donation status</div><h1>{result.ok?"Thank you for supporting REFI.":"We need to confirm your payment."}</h1><p>{result.ok?"Your payment has been verified successfully.":"Please contact the Foundation if you completed payment and this page does not confirm it."}</p></div></section><section className={styles.body}><div className={styles.container}><div className={styles.card} style={{maxWidth:760,margin:"0 auto",textAlign:"center"}}>{result.ok?<><CheckCircle2 size={48}/><h2 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:48}}>Donation confirmed.</h2><p style={{fontSize:20}}>₦{Number(result.amount||0).toLocaleString()} {result.currency||"NGN"}</p><p>Reference: <strong>{result.reference}</strong></p></>:<><h2 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:42}}>Verification incomplete.</h2><p>{result.error}</p></>}<div className={styles.actions} style={{justifyContent:"center"}}><Link className={styles.primary} href="/play">Play for Impact <ArrowRight size={16}/></Link><Link className={styles.secondary} href="/donate">Give again <HeartHandshake size={16}/></Link></div></div></div></section><SiteFooter/></main>
}