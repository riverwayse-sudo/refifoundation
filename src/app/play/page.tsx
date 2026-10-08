"use client";
import Link from "next/link";
import { ArrowRight, HeartHandshake, RotateCcw, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { SiteFooter, SiteHeader } from "../_components/site-chrome";
import styles from "../engagement.module.css";

const GAME_SECONDS=30;

export default function PlayPage(){
 const [running,setRunning]=useState(false),[seconds,setSeconds]=useState(GAME_SECONDS),[score,setScore]=useState(0),[position,setPosition]=useState({x:50,y:50});
 useEffect(()=>{if(!running)return;const timer=window.setInterval(()=>setSeconds(s=>{if(s<=1){setRunning(false);return 0}return s-1}),1000);return()=>window.clearInterval(timer)},[running]);
 const moveTarget=()=>setPosition({x:12+Math.random()*76,y:15+Math.random()*70});
 const start=()=>{setScore(0);setSeconds(GAME_SECONDS);setRunning(true);moveTarget()};
 const hit=()=>{if(running){setScore(s=>s+1);moveTarget()}};
 return <main className={styles.shell}><SiteHeader/>
 <section className={styles.hero}><div className={styles.heroInner}><div className={styles.eyebrow}>REFI · Play for Impact</div><h1>Play. Challenge yourself. Create impact.</h1><p>Start with the Refi Challenge: a short browser game designed to make participation the first step towards supporting the Foundation.</p><div className={styles.actions}><a className={styles.primary} href="#game">Play the challenge <ArrowRight size={16}/></a><Link className={styles.secondary} href="/donate">Give directly <HeartHandshake size={16}/></Link></div></div></section>
 <section id="game" className={styles.body}><div className={styles.container}><div className={styles.grid2}>
 <div className={styles.game}><div className={styles.gameTop}><div className={styles.metric}><strong>{score}</strong><span>Score</span></div><div className={styles.metric}><strong>{seconds}s</strong><span>Time</span></div><div className={styles.metric}><strong>30</strong><span>Seconds</span></div></div><div className={styles.arena}>
 {!running&&seconds===0?<div className={styles.gameMessage}><div><Trophy size={32}/><h2>Challenge complete.</h2><div className={styles.score}>{score}</div><p>Can a friend beat your score?</p><div className={styles.actions}><button className={styles.primary} onClick={start}><RotateCcw size={16}/> Play again</button><Link className={styles.secondary} href="/donate">Support Refi</Link></div></div></div>:!running?<div className={styles.gameMessage}><div><Trophy size={32}/><h2>Ready?</h2><p>Tap the target as many times as you can in 30 seconds.</p><div className={styles.actions}><button className={styles.primary} onClick={start}>Start challenge</button></div></div></div>:<button aria-label="Hit target" className={styles.target} style={{left:position.x+"%",top:position.y+"%"}} onClick={hit}/>}</div></div>
 <div><div className={styles.eyebrow} style={{color:"var(--refi-blue-700)"}}>Why we're building this</div><h2 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:"clamp(36px,5vw,56px)",lineHeight:1.02,margin:"12px 0 18px"}}>Participation before persuasion.</h2><p style={{fontSize:18,color:"var(--refi-ink-soft)"}}>The game is deliberately simple. It gives people a reason to stay, play and share before asking them to give.</p><div className={styles.note}>Your score is a game result, not a donation or a prize. Refi will never require payment to play.</div><div className={styles.actions}><Link className={styles.primary} href="/fundraise">Turn play into a fundraiser <ArrowRight size={16}/></Link></div></div>
 </div></div></section><SiteFooter/></main>
}