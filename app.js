
/* GW14_ARCADE_EVOLUTION */
window.GWArcade={
  modes:[
    {id:'classic',name:'کلاسیک',icon:'🎮',desc:'قوانین اصلی بازی'},
    {id:'rush',name:'سریع',icon:'⚡',desc:'زمان کمتر، امتیاز بیشتر'},
    {id:'zen',name:'زن',icon:'🌙',desc:'بدون فشار، برای تمرین'},
    {id:'chaos',name:'Chaos',icon:'🎲',desc:'قانون تصادفی هر راند'}
  ],
  modifiers:['امتیاز ×۲','زمان کوتاه','راند طلایی','کارت ویژه','کمبو فعال','حالت سخت'],
  current:'classic', modifier:'', combo:0,
  choose(m){this.current=m;this.modifier=m==='chaos'?this.modifiers[Math.floor(Math.random()*this.modifiers.length)]:'';this.render() },
  score(n){let x=n;if(this.current==='rush')x=Math.round(x*1.35);if(this.current==='zen')x=Math.round(x*.85);if(this.current==='chaos'&&this.modifier==='امتیاز ×۲')x*=2;return x},
  render(){const e=document.getElementById('gwModes');if(!e)return;e.innerHTML=this.modes.map(m=>`<button class="gw-mode ${m.id===this.current?'active':''}" onclick="GWArcade.choose('${m.id}')">${m.icon} ${m.name}</button>`).join('')+(this.modifier?`<small class="gw-modifier">🎲 ${this.modifier}</small>`:'')},
  mount(){if(document.getElementById('gwModes'))return;const p=document.getElementById('gameMeta');if(!p)return;const d=document.createElement('div');d.id='gwModes';d.className='gw-modes';p.parentNode.insertBefore(d,p.nextSibling);this.render()}
};
document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>GWArcade.mount(),220));

// More forgiving, replayable number mode: multiple rounds and dynamic difficulty.
window.gw14NumberRush=function(a){
  let round=1,total=5,score=0,streak=0,ended=false;
  const draw=()=>{if(ended)return;const max=GWArcade.current==='rush'?12:9,target=1+Math.floor(Math.random()*max),end=Date.now()+(GWArcade.current==='rush'?4200:6200);a.innerHTML=gameHeader(`🔢 راند ${round}/${total}`)+`<div class="game-instructions">عدد <b>${target}</b> را پیدا کن.</div><div id="countdown" class="timer">${((end-Date.now())/1000).toFixed(1)}</div><div id="numbersAlive" class="numbers">${Array.from({length:max},(_,i)=>i+1).map(n=>`<button onclick="window.gw14NumberPick(${n},${target},${round},${total},${end})">${n}</button>`).join('')}</div><div class="combo-line">🔥 کمبو ${streak} · ⭐ ${score}</div>`;window.__gw14={round,total,score,streak,ended,end};const t=setInterval(()=>{if(ended){clearInterval(t);return}const left=Math.max(0,(end-Date.now())/1000);if(document.getElementById('countdown'))document.getElementById('countdown').textContent=left.toFixed(1);if(left<=0){clearInterval(t);window.gw14NumberPick(-1,target,round,total,end)}},70);window.numberTimer=t};
  draw();window.__gw14Draw=draw;
};
window.gw14NumberPick=function(n,target,round,total,end){const q=window.__gw14;if(!q||q.ended)return;if(window.numberTimer)clearInterval(window.numberTimer);const ok=n===target;if(ok){q.streak++;q.score+=GWArcade.score(100+q.streak*25)}else q.streak=0;if(round>=total){q.ended=true;gameSession.score=q.score;finish(q.score>=GWArcade.score(300));$('#gameArea').innerHTML=result(q.score>=GWArcade.score(300))+`<p class="scoreline">⭐ ${q.score} امتیاز · 🔥 کمبو ${q.streak}</p>`;return}q.round++;window.__gw14Draw()};

// Enhanced memory: difficulty varies the board and a combo rewards fast matching.
window.gw14Memory=function(a){
  const size=GWArcade.current==='rush'?12:8, pairs=size/2, icons=['🔥','⚡','👑','👻','🌙','💎'];let cards=[];for(let i=0;i<pairs;i++)cards.push(i,i);cards.sort(()=>Math.random()-.5);memoryOpen=[];memoryFound=[];gameSession.moves=0;gameSession.score=0;gameSession.locked=false;
  a.innerHTML=gameHeader(`🧠 ${size} کارت`)+`<div class="game-instructions">جفت‌ها را پیدا کن؛ حرکت سریع‌تر = کمبو بیشتر.</div><div class="memory gw-memory-plus">${cards.map((x,i)=>`<button id="m${i}" onclick="gw14Flip(${i})">?</button>`).join('')}</div><div id="memStats" class="combo-line">حرکت ۰ · 🔥 کمبو ۰</div>`;window.gwMem={cards,icons,combo:0,started:performance.now()};
};
window.gw14Flip=function(i){const q=window.gwMem;if(!q||gameSession.locked||memoryFound.includes(i)||memoryOpen.includes(i))return;$('#m'+i).textContent=q.icons[q.cards[i]];memoryOpen.push(i);GWAudio?.flip();if(memoryOpen.length<2)return;gameSession.moves++;gameSession.locked=true;const [x,y]=memoryOpen;if(q.cards[x]===q.cards[y]){q.combo++;memoryFound.push(x,y);memoryOpen=[];gameSession.locked=false;gameSession.score+=GWArcade.score(120+q.combo*35);GWAudio?.good();$('#memStats').textContent=`حرکت ${gameSession.moves} · 🔥 کمبو ${q.combo}`;if(memoryFound.length===q.cards.length){finish(true);setTimeout(()=>$('#gameArea').innerHTML=result(true)+`<p class="scoreline">در ${gameSession.moves} حرکت · ⭐ ${gameSession.score}</p>`,250)}}else{q.combo=0;setTimeout(()=>{$('#m'+x).textContent='?';$('#m'+y).textContent='?';memoryOpen=[];gameSession.locked=false;$('#memStats').textContent=`حرکت ${gameSession.moves} · 🔥 کمبو ۰`},430)}};

// Add a proper game-mode bar and replace two overly-simple games.
window.addEventListener('load',()=>{
  const oldNum=window.launch; if(typeof oldNum==='function'&&!window.__gw14Launch){
    const original=oldNum; window.launch=function(id){if(id==='number')return gw14NumberRush($('#gameArea'));if(id==='memory')return gw14Memory($('#gameArea'));return original(id)};window.__gw14Launch=true;
  }
});


/* GW13_REPLAY_ENGINE */
window.GWReplay={
  key:"gw13_replay",
  games:["reaction","memory","number","tictac","cards","war","uno","mafia"],
  load(){try{return JSON.parse(localStorage.getItem(this.key)||"{}")}catch(e){return{}}},
  save(x){localStorage.setItem(this.key,JSON.stringify(x))},
  day(){return new Date().toISOString().slice(0,10)},
  hash(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0},
  today(){
    const p=this.load(), d=this.day();
    if(p.day!==d){
      const seed=this.hash(d);
      p.day=d;p.seed=seed;p.dailyGame=this.games[seed%this.games.length];
      p.dailyGoal=3+(seed%4);p.dailyWins=0;p.dailyDone=false;
      p.modifier=["زمان سریع","امتیاز دوبرابر","راند اضافه","حالت سخت"][seed%4];
      this.save(p);
    }
    return p;
  },
  record(id,win){
    const p=this.today();p.plays=(p.plays||0)+1;
    p.best=p.best||{};p.best[id]=Math.max(p.best[id]||0,win?100:0);
    if(id===p.dailyGame&&win)p.dailyWins=(p.dailyWins||0)+1;
    if(p.dailyWins>=p.dailyGoal&&!p.dailyDone){p.dailyDone=true;p.coins=(p.coins||0)+75;this.toast("🎯 چالش روز کامل شد! +۷۵ سکه")}
    this.save(p);this.render();
  },
  randomModifier(){
    return ["⚡ سرعتی","🔥 امتیاز دوبرابر","🧠 حافظه سخت","🎲 شانس ویژه","⏱️ زمان محدود"][Math.floor(Math.random()*5)];
  },
  render(){
    const p=this.today(),el=document.getElementById("gwReplay");
    if(el)el.innerHTML=`<b>🎯 چالش امروز</b><span>${p.dailyGame||"—"} · ${p.modifier||"—"}</span><small>${p.dailyWins||0}/${p.dailyGoal||3} برد</small>`;
  },
  toast(m){let e=document.getElementById("gwReplayToast");if(!e){e=document.createElement("div");e.id="gwReplayToast";document.body.appendChild(e)}e.textContent=m;e.classList.add("show");clearTimeout(this.t);this.t=setTimeout(()=>e.classList.remove("show"),2200)}
};


/* GW12_AI */
window.GWAI={
  open(){
    let box=document.getElementById("gwAI");
    if(!box){this.mount();box=document.getElementById("gwAI")}
    box.classList.add("open"); document.getElementById("gwAIInput")?.focus();
  },
  close(){document.getElementById("gwAI")?.classList.remove("open")},
  mount(){
    if(document.getElementById("gwAI"))return;
    const b=document.createElement("div");b.id="gwAI";
    b.innerHTML=`<div class="gw-ai-card">
      <div class="gw-ai-head"><div><b>🤖 GameWorld AI</b><small>دستیار بازی و سایت</small></div><button id="gwAIX">×</button></div>
      <div id="gwAIMsg" class="gw-ai-msg"><div class="ai-bubble">سلام! درباره بازی‌ها، قوانین یا امکانات GameWorld بپرس 🎮</div></div>
      <div class="gw-ai-suggest"><button>کدوم بازی رو پیشنهاد می‌دی؟</button><button>چطور امتیاز بگیرم؟</button><button>قوانین بازی‌ها چیه؟</button></div>
      <form id="gwAIForm"><input id="gwAIInput" maxlength="1200" placeholder="سؤالت رو بنویس..."><button>➤</button></form>
    </div>`;
    document.body.appendChild(b);
    document.getElementById("gwAIX").onclick=()=>this.close();
    document.querySelectorAll(".gw-ai-suggest button").forEach(x=>x.onclick=()=>{document.getElementById("gwAIInput").value=x.textContent;document.getElementById("gwAIForm").requestSubmit()});
    document.getElementById("gwAIForm").onsubmit=async e=>{
      e.preventDefault();const input=document.getElementById("gwAIInput"),msg=input.value.trim();if(!msg)return;
      const area=document.getElementById("gwAIMsg");area.insertAdjacentHTML("beforeend",`<div class="user-bubble">${msg.replace(/[<>&]/g,"")}</div>`);input.value="";
      const wait=document.createElement("div");wait.className="ai-bubble";wait.textContent="در حال فکر کردن…";area.appendChild(wait);area.scrollTop=area.scrollHeight;
      try{
        const r=await fetch("/api/ai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:msg})});
        const d=await r.json();wait.textContent=d.answer||d.error||"پاسخی دریافت نشد.";
      }catch(err){wait.textContent="ارتباط با دستیار برقرار نشد. اگر سایت آفلاین است، سرور را اجرا کن."}
      area.scrollTop=area.scrollHeight;
    };
  }
};
document.addEventListener("DOMContentLoaded",()=>{
  const btn=document.createElement("button");btn.id="gwAIFab";btn.textContent="🤖 AI";btn.onclick=()=>GWAI.open();document.body.appendChild(btn);
});


/* GW11_100X_EVOLUTION */
window.GW11={
  version:"11.0",
  key:"gw11",
  load(){try{return JSON.parse(localStorage.getItem(this.key)||"{}")}catch(e){return{}}},
  save(p){localStorage.setItem(this.key,JSON.stringify(p))},
  profile(){
    const p=this.load();
    p.name=p.name||"بازیکن"; p.xp=p.xp||0; p.level=p.level||1;
    p.coins=p.coins||0; p.games=p.games||0; p.wins=p.wins||0;
    p.streak=p.streak||0; p.favorites=p.favorites||[]; p.recent=p.recent||[];
    return p;
  },
  levelUp(){
    const p=this.profile(), need=p.level*100;
    if(p.xp>=need){p.xp-=need;p.level++;p.coins+=50;this.save(p);this.toast("🎉 لول آپ! +۵۰ سکه")}
  },
  record(id,win=false){
    const p=this.profile(); p.games++; if(win)p.wins++;
    p.xp+=win?20:6; p.coins+=win?12:2;
    p.recent=[id,...p.recent.filter(x=>x!==id)].slice(0,6);
    p.history=p.history||{}; p.history[id]=(p.history[id]||0)+1;
    this.save(p); this.levelUp(); this.renderMini();
  },
  favorite(id){
    const p=this.profile();
    p.favorites=p.favorites.includes(id)?p.favorites.filter(x=>x!==id):[...p.favorites,id];
    this.save(p); this.toast(p.favorites.includes(id)?"⭐ به علاقه‌مندی‌ها اضافه شد":"حذف شد");
  },
  toast(msg){
    let t=document.getElementById("gw11Toast");
    if(!t){t=document.createElement("div");t.id="gw11Toast";document.body.appendChild(t)}
    t.textContent=msg;t.classList.add("show");clearTimeout(this.tt);
    this.tt=setTimeout(()=>t.classList.remove("show"),2100);
  },
  renderMini(){
    const p=this.profile(),el=document.getElementById("gw11PlayerMini");
    if(el)el.innerHTML=`<b>${p.name}</b><span>Lv.${p.level}</span><span>🪙 ${p.coins}</span><span>🏆 ${p.wins}</span>`;
  }
};
document.addEventListener("DOMContentLoaded",()=>GW11.renderMini());


/* GW10_PLAYER_LAYER */
window.GW10={
  key:"gw10",
  get(){
    try{return JSON.parse(localStorage.getItem(this.key)||"{}")}catch(e){return{}}
  },
  save(x){localStorage.setItem(this.key,JSON.stringify(x))},
  touchGame(id,win=false){
    const p=this.get(); p.recent=[id,...(p.recent||[]).filter(x=>x!==id)].slice(0,5);
    p.history=p.history||{}; p.history[id]=(p.history[id]||0)+1;
    if(win)p.wins=(p.wins||0)+1;
    p.xp=(p.xp||0)+(win?18:5);
    p.streak=p.streak||0;
    this.save(p);
  },
  toast(msg){
    let el=document.getElementById("gwToast");
    if(!el){el=document.createElement("div");el.id="gwToast";document.body.appendChild(el)}
    el.textContent=msg;el.classList.add("show");clearTimeout(this.t);
    this.t=setTimeout(()=>el.classList.remove("show"),2200);
  }
};


/* GW8_AUDIO */
window.GWAudio=(()=>{
  let ctx=null,master=null,muted=localStorage.getItem("gw_audio_mute")==="1";
  function init(){if(ctx)return;ctx=new(window.AudioContext||window.webkitAudioContext)();master=ctx.createGain();master.gain.value=.055;master.connect(ctx.destination)}
  function tone(f,d=.08,type="sine",v=.3,w=0){if(muted)return;try{init();const t=ctx.currentTime+w,o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(f,t);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,v),t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(master);o.start(t);o.stop(t+d+.02)}catch(e){}}
  return{
    unlock(){try{init();if(ctx.state==="suspended")ctx.resume()}catch(e){}},
    click(){tone(520,.045,"triangle",.25)}, start(){tone(392,.09,"triangle",.22);tone(523,.12,"triangle",.2,.09)},
    good(){tone(660,.09,"sine",.3);tone(880,.13,"sine",.25,.07)},
    bad(){tone(180,.12,"sawtooth",.18);tone(120,.16,"sine",.14,.08)},
    win(){[523,659,784,1047].forEach((f,i)=>tone(f,.14,"sine",.22,i*.075))},
    flip(){tone(300,.045,"triangle",.16)},
    setMuted(v){muted=!!v;localStorage.setItem("gw_audio_mute",muted?"1":"0")},
    isMuted(){return muted}
  }
})();
document.addEventListener("pointerdown",()=>window.GWAudio.unlock(),{once:true});

const $=s=>document.querySelector(s);
const GAMES=[
{id:"reaction",name:"Reaction Rush",icon:"⚡",cat:"brain",desc:"واکنشت را در چند راند واقعی بسنج.",tag:"۱ نفر",difficulty:"سریع",time:"۲ دقیقه"},
{id:"memory",name:"Memory Grid",icon:"🧠",cat:"brain",desc:"جفت‌ها را پیدا کن و کمبو بساز.",tag:"۱ نفر",difficulty:"متوسط",time:"۳ دقیقه"},
{id:"number",name:"Number Rush",icon:"🔢",cat:"brain",desc:"عدد هدف را قبل از تمام شدن زمان پیدا کن.",tag:"۱ نفر",difficulty:"سریع",time:"۱ دقیقه"},
{id:"tictac",name:"دوز",icon:"⭕",cat:"party",desc:"نبرد سریع سه‌درسه با دوست یا حریف محلی.",tag:"۱–۲ نفر",difficulty:"متوسط",time:"۲ دقیقه"}
];
const SHOP=[
{id:"avatar1",emoji:"😎",name:"آواتار خفن",price:120},
{id:"avatar2",emoji:"👻",name:"آواتار روح",price:180},
{id:"frame",emoji:"💜",name:"قاب بنفش",price:250},
{id:"title",emoji:"🔥",name:"عنوان Fire",price:300},
{id:"crown",emoji:"👑",name:"تاج",price:500},
{id:"spark",emoji:"✨",name:"افکت Spark",price:350}
];
const PETS=[
{id:"bunny",name:"پوفی",emoji:"🐰",rarity:"آرام و دوست‌داشتنی",price:220,base:28},
{id:"cat",name:"موچی",emoji:"🐱",rarity:"باهوش و بازیگوش",price:280,base:32},
{id:"fox",name:"فاکسی",emoji:"🦊",rarity:"سریع و زرنگ",price:340,base:37},
{id:"panda",name:"پاندو",emoji:"🐼",rarity:"قلدرِ گوگولی",price:420,base:44},
{id:"dragon",name:"دراکو",emoji:"🐲",rarity:"کمیاب",price:650,base:55}
];
const PET_ITEMS=[
{id:"wood_sword",name:"شمشیر چوبی",emoji:"🗡️",price:120,power:8,slot:"weapon"},
{id:"moon_blade",name:"شمشیر ماه",emoji:"⚔️",price:320,power:18,slot:"weapon"},
{id:"star_blade",name:"شمشیر ستاره‌ای",emoji:"🌟",price:600,power:32,slot:"weapon"},
{id:"tiny_shield",name:"سپر کوچولو",emoji:"🛡️",price:160,power:7,slot:"armor"},
{id:"cloud_armor",name:"زره ابری",emoji:"☁️",price:360,power:19,slot:"armor"},
{id:"royal_armor",name:"زره سلطنتی",emoji:"👑",price:680,power:34,slot:"armor"}
];
const AVATARS=[
{id:"neon",name:"قهرمان نئون",src:"avatars/neon.svg"},{id:"shadow",name:"شدو",src:"avatars/shadow.svg"},{id:"cyber",name:"سایبر",src:"avatars/cyber.svg"},{id:"ghost",name:"روح",src:"avatars/ghost.svg"},{id:"fire",name:"آتش",src:"avatars/fire.svg"},{id:"ice",name:"یخی",src:"avatars/ice.svg"},{id:"gold",name:"طلایی",src:"avatars/gold.svg"},{id:"forest",name:"جنگلی",src:"avatars/forest.svg"}
];
let data=JSON.parse(localStorage.getItem("gw4")||"null")||{name:"Player",avatar:"neon",xp:0,level:1,wins:0,games:0,coins:250,rating:1000,streak:0,mission:0,owned:[],ach:[]};
if(!data.avatar)data.avatar="neon";
if(!data.pet){data.pet={id:"bunny",name:"پوفی",level:1,xp:0,energy:100,weapon:null,armor:null,wins:0};}
if(!data.petItems)data.petItems=[];
let ws=null,currentGame=null,reactionTimer=null,reactionStart=0,memoryOpen=[],memoryFound=[],tt=null;
let soundOn=localStorage.getItem("gwSound")!=="0";
const stats=JSON.parse(localStorage.getItem("gwStats")||"{}");
function stat(id){return stats[id]||{plays:0,best:0};}
function saveStat(id,score){const x=stat(id);x.plays++;x.best=Math.max(x.best,Math.round(score||0));stats[id]=x;localStorage.setItem("gwStats",JSON.stringify(stats))}
function toggleSound(){soundOn=!soundOn;localStorage.setItem("gwSound",soundOn?"1":"0");updateSoundButton()}
function updateSoundButton(){const b=$("#soundToggle");if(b)b.textContent=soundOn?"🔊 صدا روشن":"🔇 صدا خاموش"}
let gameSession={score:0,round:1,total:3,moves:0,locked:false};
function resetSession(total=3){gameSession={score:0,round:1,total,moves:0,locked:false}}
function beep(freq=520,duration=.06){if(!soundOn)return;try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const c=new C(),o=c.createOscillator(),g=c.createGain();o.frequency.value=freq;o.type="sine";g.gain.value=.035;o.connect(g);g.connect(c.destination);o.start();g.gain.exponentialRampToValueAtTime(.001,c.currentTime+duration);o.stop(c.currentTime+duration);setTimeout(()=>c.close?.(),duration*1000+80)}catch{}}
function gameHeader(note='') { return `<div class="live-stats"><span>🎯 امتیاز <b>${gameSession.score}</b></span><span>🔁 راند <b>${gameSession.round}/${gameSession.total}</b></span>${note?`<span>${note}</span>`:''}</div>` }
function replay(){if(currentGame)openGameScreen(currentGame)}

function save(){localStorage.setItem("gw4",JSON.stringify(data));updateUI()}
function toast(t){const e=$("#toast");e.textContent=t;e.classList.add("show");clearTimeout(window.__toast);window.__toast=setTimeout(()=>e.classList.remove("show"),1800)}
function show(id){ window.GWAudio.click();if(window.numberTimer)clearInterval(window.numberTimer);clearTimeout(reactionTimer);document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));$("#"+id).classList.add("active");document.querySelectorAll(".bottom button").forEach(x=>x.classList.toggle("active",x.dataset.page===id));updateUI()}
function updateUI(){
 const set=(id,v)=>{if($("#"+id))$("#"+id).textContent=v};
 ["level","profileLevel"].forEach(id=>set(id,data.level));set("xp",data.xp);set("wins",data.wins);["coins","shopCoins","profileCoins"].forEach(id=>set(id,data.coins));
 set("profileGames",data.games);set("profileWins",data.wins);if($("avatar")){const av=AVATARS.find(x=>x.id===data.avatar)||AVATARS[0];$("avatar").innerHTML=`<img src="${av.src}" alt="${av.name}">`;}set("profileRating",data.rating);set("myRating",data.rating);set("profileStreak",data.streak);set("profileName",data.name); renderPetUI();
 set("missionText",`${Math.min(data.mission,3)} / ۳ بازی`);
 if($("#missionBar"))$("#missionBar").style.width=`${Math.min(data.mission,3)/3*100}%`;
 if($("#xpBar"))$("#xpBar").style.width=`${data.xp%(data.level*100)/(data.level*100)*100}%`;
 if($("#achievements"))$("#achievements").innerHTML=(data.ach.length?data.ach:["🎮 شروع‌کننده"]).map(x=>`<span class="badge">${x}</span>`).join("");
}
function addXP(n){data.xp+=n;data.coins+=Math.ceil(n/10);while(data.xp>=data.level*100)data.level++;save()}
function finish(win=true){
 data.games++;if(win){data.wins++;data.rating+=10;data.streak++}else data.streak=0;if(data.mission<3)data.mission++;addXP(win?100:50);
 if(data.wins>=1&&!data.ach.includes("🏆 اولین برد"))data.ach.push("🏆 اولین برد");
 if(data.games>=10&&!data.ach.includes("🎯 ۱۰ بازی"))data.ach.push("🎯 ۱۰ بازی");save()
}
function result(win){saveStat(currentGame,gameSession.score);return `<div class="result"><div class="result-icon">${win?"🎉":"😅"}</div><h2>${win?"بردی!":"این راند را باختی"}</h2><p>پاداش بازی به حساب اضافه شد.</p><div class="result-score">⭐ ${Math.round(gameSession.score)} امتیاز</div><div class="result-actions"><button class="primary" onclick="replay()">🔄 دوباره بازی</button><button class="secondary" onclick="show('games')">🎮 بازی‌های دیگر</button></div></div>`}
function openGameScreen(id){
 resetSession(id==="reaction"||id==="number"?5:3);
 currentGame=id;const g=GAMES.find(x=>x.id===id),st=stat(id);show("play");
 $("#gameTitle").textContent=g.name;$("#gameSubtitle").textContent=g.desc;
 $("#gameBadge").textContent=g.icon;
 $("#gameMeta").innerHTML=`<span>👥 ${g.tag}</span><span>⚙️ ${g.difficulty}</span><span>⏱️ ${g.time}</span><span>🏆 رکورد ${st.best}</span>`;
 $("#gameArea").innerHTML=`<div class="loading">در حال آماده‌سازی ${g.name}...</div>`;
 setTimeout(()=>launch(id),120);
}
function launch(id){
 const a=$("#gameArea");if(id==="reaction")return reaction(a);if(id==="memory")return memory(a);if(id==="number")return numberRush(a);if(id==="tictac")return ticTac(a);if(id==="cards"||id==="war")return cardGame(a,id);if(id==="uno")return uno(a);if(id==="mafia")return mafia(a)
}
function renderGames(filter="all"){const l=$("#gameList");l.innerHTML=GAMES.filter(g=>filter==="all"||g.cat===filter).map(g=>{const st=stat(g.id);return `<article class="game-card card" onclick="openGameScreen('${g.id}')"><div class="gi">${g.icon}</div><div class="info"><div class="game-card-top"><h3>${g.name}</h3><span class="mini-badge">${g.difficulty}</span></div><p>${g.desc}</p><div class="meta"><span>${g.tag}</span><span>🏆 ${st.best}</span><span>▶ بازی</span></div></div></article>`}).join("")}
function filterGames(c,b){document.querySelectorAll(".chip").forEach(x=>x.classList.remove("active"));b.classList.add("active");renderGames(c)}
function randomGame(){openGameScreen(GAMES[Math.floor(Math.random()*GAMES.length)].id)}
function reaction(a){
 clearTimeout(reactionTimer);reactionStart=0;gameSession.round=1;gameSession.score=0;
 a.innerHTML=gameHeader('⚡ سریع ولی دقیق')+`<div class="game-instructions">وقتی دایره سبز شد، سریع بزن. ۵ راند داری.</div><button id="target" class="target idle" onclick="hitReaction()">شروع</button><div id="reactionText" class="scoreline">آماده‌ای؟</div>`;
}
function hitReaction(){
 const b=$("#target");
 if(!reactionStart){reactionStart=performance.now();b.className="target wait";$("#reactionText").textContent="صبر کن...";beep(260);reactionTimer=setTimeout(()=>{b.className="target go";$("#reactionText").textContent="الان!";reactionStart=performance.now();beep(760,.09)},700+Math.random()*1700);return}
 if(b.classList.contains("wait")){clearTimeout(reactionTimer);reactionStart=0;finish(false);$("#gameArea").innerHTML=result(false)+`<p class="scoreline">زود زدی؛ صبر کردن بخشی از بازیه.</p>`;return}
 const ms=Math.round(performance.now()-reactionStart);reactionStart=0;const ok=ms<700;gameSession.score+=Math.max(100,1000-ms);beep(ok?900:330);if(gameSession.round<gameSession.total){gameSession.round++;b.className="target idle";$("#reactionText").textContent=`${ms}ms — راند بعدی؛ دوباره بزن`;$("#gameArea").firstElementChild.outerHTML=gameHeader(`⚡ ${ms}ms`);return}
 const win=gameSession.score>=2500;finish(win);$("#gameArea").innerHTML=result(win)+`<p class="scoreline">امتیاز نهایی: ${gameSession.score}</p>`;
}
function memory(a){
 const cards=[0,0,1,1,2,2,3,3].sort(()=>Math.random()-.5),icons=["🔥","⚡","👑","👻"];memoryOpen=[];memoryFound=[];gameSession.moves=0;
 a.innerHTML=gameHeader('🧠 کمترین حرکت')+`<div class="game-instructions">جفت‌ها را پیدا کن. حرکت کمتر یعنی امتیاز بیشتر.</div><div class="memory">${cards.map((x,i)=>`<button id="m${i}" onclick="flip(${i},${x})">?</button>`).join("")}</div>`;
 window.memCards=cards;window.memIcons=icons;
}
function flip(i,x){if(gameSession.locked||memoryFound.includes(i))return;$("#m"+i).textContent=window.memIcons[x];memoryOpen.push(i);beep(600);if(memoryOpen.length!==2)return;gameSession.moves++;gameSession.locked=true;const [a,b]=memoryOpen;if(window.memCards[a]===window.memCards[b]){memoryFound.push(a,b);memoryOpen=[];gameSession.locked=false;gameSession.score+=150;beep(850);$("#gameArea").firstElementChild.outerHTML=gameHeader(`🧠 ${gameSession.moves} حرکت`);if(memoryFound.length===window.memCards.length){finish(true);setTimeout(()=>$("#gameArea").innerHTML=result(true)+`<p class="scoreline">در ${gameSession.moves} حرکت کاملش کردی.</p>`,350)}}else setTimeout(()=>{$("#m"+a).textContent="?";$("#m"+b).textContent="?";memoryOpen=[];gameSession.locked=false},500)}
function numberRush(a){
 const target=Math.ceil(Math.random()*9),end=Date.now()+6500;gameSession.target=target;
 a.innerHTML=gameHeader('🔢 ۶.۵ ثانیه')+`<div class="game-instructions">عدد <b>${target}</b> را پیدا کن.</div><div id="countdown" class="timer">6.5</div><div id="numbersAlive" class="numbers">${[1,2,3,4,5,6,7,8,9].map(n=>`<button onclick="numberPick(${n},${target})">${n}</button>`).join("")}</div>`;
 const t=setInterval(()=>{const left=Math.max(0,(end-Date.now())/1000);if($("#countdown"))$("#countdown").textContent=left.toFixed(1);if(left<=0){clearInterval(t);if(currentGame==="number"&&$("#numbersAlive")){$("#numbersAlive").removeAttribute("id");gameSession.score=0;finish(false);$("#gameArea").innerHTML=result(false)+`<p class="scoreline">زمان تمام شد.</p>`}}},80);window.numberTimer=t
}
function numberPick(n,t){if(!$("#numbersAlive"))return;if(window.numberTimer)clearInterval(window.numberTimer);const w=n===t;$("#numbersAlive").removeAttribute("id");gameSession.score=w?100:0;finish(w);$("#gameArea").innerHTML=result(w)}
function ticTac(a){tt={b:Array(9).fill(""),turn:"X"};renderTT()}
function renderTT(){const a=$("#gameArea");a.innerHTML=`<div class="game-instructions">نوبت <b>${tt.turn}</b></div><div class="tictac">${tt.b.map((x,i)=>`<button onclick="tic(${i})">${x||"·"}</button>`).join("")}</div>`}
function tic(i){if(tt.b[i])return;tt.b[i]=tt.turn;const L=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];if(L.some(x=>x.every(k=>tt.b[k]===tt.turn))){finish(true);return $("#gameArea").innerHTML=result(true)}if(tt.b.every(Boolean)){finish(false);return $("#gameArea").innerHTML=result(false)}tt.turn=tt.turn==="X"?"O":"X";renderTT()}
function cardGame(a,id){const title=id==="war"?"جنگ کارت‌ها":"پاسور";gameSession.score=0;a.innerHTML=gameHeader('🃏 حریف رایانه‌ای')+`<div class="game-instructions">${title}: کارت بکش؛ عدد بالاتر برنده است.</div><div id="card" class="big-card">🂠</div><button class="primary" onclick="drawCard()">🃏 کارت بکش</button><p id="cardResult" class="scoreline">۳ راند</p>`}
function drawCard(){const suits=["♠","♥","♦","♣"],names=["A","2","3","4","5","6","7","8","9","10","J","Q","K"],m=Math.floor(Math.random()*13)+1,b=Math.floor(Math.random()*13)+1,s=suits[Math.floor(Math.random()*4)];$("#card").textContent=`${names[m-1]}${s}`;const w=m>=b;gameSession.score+=w?100:0;$("#cardResult").textContent=`کارت حریف: ${names[b-1]} • امتیاز ${gameSession.score}`;beep(w?850:300);if(gameSession.round<gameSession.total){gameSession.round++;$("#gameArea").firstElementChild.outerHTML=gameHeader(`🃏 امتیاز ${gameSession.score}`);return}finish(gameSession.score>=200);setTimeout(()=>$("#gameArea").innerHTML=result(gameSession.score>=200)+`<p class="scoreline">امتیاز نهایی: ${gameSession.score}</p>`,250)}
function uno(a){const colors=["🔴","🟡","🟢","🔵"],n=Math.floor(Math.random()*10),c=colors[Math.floor(Math.random()*4)];const picks=[{c,n},{c:colors.find(x=>x!==c),n:Math.floor(Math.random()*10)},{c:colors[Math.floor(Math.random()*4)],n:(n+1)%10},{c:colors[Math.floor(Math.random()*4)],n:Math.floor(Math.random()*10)},{c:colors[Math.floor(Math.random()*4)],n:Math.floor(Math.random()*10)},{c:colors[Math.floor(Math.random()*4)],n:Math.floor(Math.random()*10)}];a.innerHTML=`<div class="game-instructions">کارت هم‌رنگ یا هم‌شماره بازی کن.</div><div class="big-card">${c}${n}</div><div class="numbers">${picks.map(x=>`<button onclick="unoPick('${x.c}',${x.n},'${c}',${n})">${x.c}${x.n}</button>`).join("")}</div>`}
function unoPick(c,n,tc,tn){const w=c===tc||n===tn;finish(w);$("#gameArea").innerHTML=result(w)}
function mafia(a){a.innerHTML=`<div class="mafia-art">🕵️</div><h2>اتاق مافیا</h2><p>یک اتاق بساز، کد را برای دوستانت بفرست و وقتی بازیکن‌ها جمع شدند شروع کنید.</p><button class="primary" onclick="openOnline()">🌐 ورود به اتاق آنلاین</button>`}
function openOnline(){show("online");connect()}
/* GW17 SOCIAL + AI CONTEXT */
window.GWSocial={
  open(){show("social"); setTimeout(()=>$("#gwChatInput")?.focus(),80)},
  send(){const input=$("#gwChatInput"),msg=String(input?.value||"").trim();if(!msg)return;if(msg.length>300)return toast("پیام خیلی طولانیه.");connect(()=>ws.send(JSON.stringify({type:"chat",text:msg})));input.value=""},
  add(d){const area=$("#gwChatMessages");if(!area)return;const el=document.createElement("div");el.className="chat-line "+(d.id===clientsafeId()?"mine":"");el.innerHTML=`<b>${escChat(d.name||"Player")}</b><span>${escChat(d.text||"")}</span><small>${new Date().toLocaleTimeString("fa-IR",{hour:"2-digit",minute:"2-digit"})}</small>`;area.appendChild(el);area.scrollTop=area.scrollHeight},
  report(){toast("گزارش ثبت شد؛ پیام‌های گزارش‌شده برای بررسی نگه‌داری می‌شوند.")},
  block(){toast("این بازیکن در این نشست بی‌صدا شد.")}
};
function escChat(v){return String(v).replace(/[<>&"']/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;","\"":"&quot;","'":"&#39;"}[c]||c))}
function clientsafeId(){return window.gwClientId||""}
window.GWVoice={active:false,toggle(){this.active=!this.active;const b=$("#gwVoiceBtn");if(b)b.textContent=this.active?"🔴 قطع صدای اتاق":"🎙️ ورود به صدای اتاق";toast(this.active?"🎙️ حالت صدای اتاق فعال شد؛ برای تماس واقعی باید مجوز میکروفن داده شود.":"🔇 صدای اتاق خاموش شد.")}};

function connect(cb){if(location.protocol==="file:"){toast("برای آنلاین باید با Node اجرا شود.");return}if(ws?.readyState===1){cb?.();return}if(ws?.readyState===0)return;const p=location.protocol==="https:"?"wss":"ws";ws=new WebSocket(`${p}://${location.host}`);ws.onopen=()=>{$("#onlineStatus").textContent="🟢 متصل";cb?.()};ws.onclose=()=>$("#onlineStatus").textContent="🔴 قطع شد";ws.onmessage=e=>{let d;try{d=JSON.parse(e.data)}catch{return;}if(d.type==="created"){$("#roomCode").value=d.room;toast("اتاق ساخته شد: "+d.room)}if(d.type==="room"){window.GWParty?.onRoom(d);$("#roomPlayers").innerHTML=`<div class="room-code">ROOM ${d.room}</div>`+d.players.map(p=>`<div class="player-row">👤 ${p.name}</div>`).join("")}if(d.type==="ready")toast("بازیکن‌ها آماده‌اند!");if(d.type==="pet_wait"){$("#petMatchStatus")&&( $("#petMatchStatus").textContent="🔎 هنوز حریفی پیدا نشده؛ منتظریم...");}if(d.type==="pet_match")renderPetBattle(d);if(d.type==="error")toast(d.message)}}
function createRoom(){if(!ws)return connect(createRoom);const n=$("#playerName").value.trim()||"Player";data.name=n;save();ws.send(JSON.stringify({type:"name",name:n}));ws.send(JSON.stringify({type:"create",game:currentGame||"mafia"}))}
function joinRoom(){if(!ws)return connect(joinRoom);const n=$("#playerName").value.trim()||"Player",r=$("#roomCode").value.trim();data.name=n;save();ws.send(JSON.stringify({type:"name",name:n}));ws.send(JSON.stringify({type:"join",room:r}))}
function renderShop(){$("#shopList").innerHTML=SHOP.map(x=>{const owned=data.owned.includes(x.id);return `<article class="shop-item"><div class="shop-emoji">${x.emoji}</div><b>${x.name}</b><p>🪙 ${x.price}</p><button class="${owned?"secondary":"primary"}" ${owned?"disabled":""} onclick="buy('${x.id}')">${owned?"خریداری شده":"خرید"}</button></article>`}).join("")}
function buy(id){const x=SHOP.find(z=>z.id===id);if(data.coins<x.price)return toast("سکه کافی نیست.");data.coins-=x.price;data.owned.push(id);if(id.startsWith("avatar"))$("#avatar").textContent=x.emoji;save();renderShop();toast("آیتم خریداری شد ✨")}

function renderAvatarChoices(){const box=$("#avatarChoices");if(!box)return;box.innerHTML=AVATARS.map(a=>`<button class="avatar-choice ${data.avatar===a.id?"selected":""}" onclick="selectAvatar('${a.id}')"><img src="${a.src}" alt="${a.name}"><span>${a.name}</span></button>`).join("")}
function selectAvatar(id){data.avatar=id;renderAvatarChoices()}
function finishSetup(){const n=$("#setupName")?.value.trim();if(n)data.name=n.slice(0,18);save();localStorage.setItem("gw_profile_ready","1");$("#profileSetup")?.classList.remove("show");toast(`خوش اومدی ${data.name} 👋`)}
function editProfile(){$("#setupName").value=data.name;$("#profileSetup").classList.add("show");renderAvatarChoices()}
function initSetup(){const first=!localStorage.getItem("gw_profile_ready");$("#setupName").value=data.name!=="Player"?data.name:"";renderAvatarChoices();if(first)$("#profileSetup").classList.add("show");}

/* GW15 TRUE 3D PET STUDIO */
let gwPet3D={raf:0,renderer:null,scene:null,camera:null,group:null};
function gwPetMat(color,rough=.75){return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:.05});}
function gwPet3DModel(type,group,weapon,armor){
  const colors={bunny:0xffc7df,cat:0xf5a45b,fox:0xf07a32,panda:0xf2f2f2,dragon:0x78e08f};
  const dark={bunny:0x6f4960,cat:0x5b3a24,fox:0x673216,panda:0x20242b,dragon:0x274e36};
  const c=colors[type]||0x9aa8ff, d=dark[type]||0x20243b;
  const body=new THREE.Mesh(new THREE.SphereGeometry(.78,20,14),gwPetMat(c));body.scale.y=1.05;body.position.y=.85;group.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.62,20,16),gwPetMat(c));head.position.set(0,1.72,.03);group.add(head);
  const eyeMat=gwPetMat(0x161922,.25);
  [-.22,.22].forEach(x=>{const e=new THREE.Mesh(new THREE.SphereGeometry(.075,10,8),eyeMat);e.position.set(x,1.82,.58);group.add(e)});
  const nose=new THREE.Mesh(new THREE.SphereGeometry(.07,10,8),gwPetMat(0xff8aa8,.4));nose.position.set(0,1.66,.62);group.add(nose);
  const earGeo=new THREE.ConeGeometry(.23,.62,16);
  const earL=new THREE.Mesh(earGeo,gwPetMat(c));earL.position.set(-.38,2.18,.02);earL.rotation.z=-.32;group.add(earL);
  const earR=earL.clone();earR.position.x=.38;earR.rotation.z=.32;group.add(earR);
  if(type==='panda'){[[-.22,1.82,.54],[.22,1.82,.54]].forEach(v=>{const m=new THREE.Mesh(new THREE.SphereGeometry(.13,12,10),gwPetMat(0x20242b));m.position.set(...v);group.add(m)})}
  if(type==='dragon'){
    const horn=new THREE.Mesh(new THREE.ConeGeometry(.12,.35,10),gwPetMat(0xd9b84a));horn.position.set(-.25,2.22,.02);group.add(horn);const h2=horn.clone();h2.position.x=.25;group.add(h2);
    const wingGeo=new THREE.ConeGeometry(.34,.7,3);const w1=new THREE.Mesh(wingGeo,gwPetMat(d));w1.position.set(-.72,1.15,-.05);w1.rotation.z=-1.1;group.add(w1);const w2=w1.clone();w2.position.x=.72;w2.rotation.z=1.1;group.add(w2);
  }
  const footGeo=new THREE.SphereGeometry(.24,14,10);[-.34,.34].forEach(x=>{const f=new THREE.Mesh(footGeo,gwPetMat(d));f.scale.z=.75;f.position.set(x,.18,.12);group.add(f)});
  const tail=new THREE.Mesh(new THREE.SphereGeometry(.28,14,10),gwPetMat(d));tail.position.set(type==='fox'?.72:.62,.72,-.28);tail.scale.set(1.2,1.2,1.4);group.add(tail);
  if(armor){const chest=new THREE.Mesh(new THREE.SphereGeometry(.47,16,10),gwPetMat(armor.includes('royal')?0xf0c64d:0x8ab7d8,.35));chest.scale.set(.95,.7,.3);chest.position.set(0,1.02,.63);group.add(chest)}
  if(weapon){const blade=new THREE.Mesh(new THREE.BoxGeometry(.07,.68,.11),gwPetMat(weapon.includes('star')?0xffe56b:weapon.includes('moon')?0x9ed8ff:0xa8a8a8,.2));blade.position.set(.82,1.18,.22);blade.rotation.z=-.35;group.add(blade);const hilt=new THREE.Mesh(new THREE.BoxGeometry(.22,.06,.13),gwPetMat(0x8b5a2b));hilt.position.set(.78,.84,.22);hilt.rotation.z=-.35;group.add(hilt)}
}
function renderPet3D(){
  const host=document.getElementById('pet3DStage'); if(!host||!window.THREE)return;
  if(gwPet3D.raf)cancelAnimationFrame(gwPet3D.raf);host.innerHTML='';
  const w=Math.max(220,Math.min(host.clientWidth||320,520)),h=Math.max(220,Math.min(host.clientHeight||300,340));
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x090d18);
  const camera=new THREE.PerspectiveCamera(35,w/h,.1,100);camera.position.set(0,1.25,4.6);camera.lookAt(0,1.05,0);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(w,h);renderer.outputColorSpace=THREE.SRGBColorSpace;host.appendChild(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xffffff,0x26324d,2.2));const key=new THREE.DirectionalLight(0xffffff,2.2);key.position.set(2,4,3);scene.add(key);const rim=new THREE.PointLight(0x7c5cff,8,8);rim.position.set(-2,2,2);scene.add(rim);
  const floor=new THREE.Mesh(new THREE.CircleGeometry(2.1,40),new THREE.MeshStandardMaterial({color:0x11182a,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.04;scene.add(floor);
  const group=new THREE.Group();const p=data.pet||{};gwPet3DModel(p.id,group,p.weapon?String(PET_ITEMS.find(x=>x.id===p.weapon)?.name||''):null,p.armor?String(PET_ITEMS.find(x=>x.id===p.armor)?.name||''):null);scene.add(group);
  gwPet3D={raf:0,renderer,scene,camera,group};let t=0;const loop=()=>{t+=.018;group.rotation.y=Math.sin(t*.7)*.28;group.position.y=Math.sin(t*1.7)*.035;renderer.render(scene,camera);gwPet3D.raf=requestAnimationFrame(loop)};loop();
}
function petPower(){const p=data.pet||{};const pet=PETS.find(x=>x.id===p.id)||PETS[0];const w=PET_ITEMS.find(x=>x.id===p.weapon)?.power||0;const ar=PET_ITEMS.find(x=>x.id===p.armor)?.power||0;return pet.base+(Math.max(0,p.level-1)*10)+w+ar;}
function renderPetUI(){
 const p=data.pet;if(!p)return;const pet=PETS.find(x=>x.id===p.id)||PETS[0];
 const w=PET_ITEMS.find(x=>x.id===p.weapon),ar=PET_ITEMS.find(x=>x.id===p.armor);
 const next=p.level*100, pct=Math.min(100,(p.xp/next)*100);
 const card=$("#petProfileCard");if(card)card.innerHTML=`<div class="pet-3d-wrap"><div id="pet3DStage" class="pet-3d-stage"></div><span class="pet-3d-label">✨ PET 3D</span></div><div class="pet-profile-main"><span class="eyebrow">PET PROFILE</span><h3>${pet.name} <small>Lv.${p.level}</small></h3><p>${pet.rarity} · ⚔️ قدرت ${petPower()}</p><div class="pet-xp"><i style="width:${pct}%"></i></div><small>XP ${p.xp}/${next} · 🏆 ${p.wins} برد</small><div class="pet-gear"><span>${w?w.emoji+" "+w.name:"🗡️ بدون سلاح"}</span><span>${ar?ar.emoji+" "+ar.name:"🛡️ بدون زره"}</span></div><button class="secondary" onclick="show('shop')">🛍️ ارتقای پت</button><button class="primary pet-upgrade-btn" onclick="upgradePet()">⬆️ ارتقا با XP</button></div>`;
 const ps=$("#petShopList");if(ps)ps.innerHTML=PETS.map(x=>{const owned=data.petItems.includes("pet_"+x.id)||data.pet.id===x.id;return `<article class="pet-shop-item ${data.pet.id===x.id?'chosen':''}"><div class="pet-face">${x.emoji}</div><b>${x.name}</b><small>${x.rarity}</small><strong>🪙 ${x.price}</strong><button class="${data.pet.id===x.id?'secondary':'primary'}" onclick="buyPet('${x.id}')">${data.pet.id===x.id?'پت فعلی':'خرید / انتخاب'}</button></article>`}).join("")+PET_ITEMS.map(x=>{const owned=data.petItems.includes(x.id);return `<article class="pet-shop-item gear"><div class="pet-face">${x.emoji}</div><b>${x.name}</b><small>قدرت +${x.power}</small><strong>🪙 ${x.price}</strong><button class="${owned?'secondary':'primary'}" ${owned?'disabled':''} onclick="buyPetItem('${x.id}')">${owned?'دارم':'خرید'}</button></article>`}).join("");
 const sc=$("#petShowcase");if(sc)sc.innerHTML=`<div class="pet-battle-preview"><span>${pet.emoji}</span><div><b>${pet.name}</b><small>قدرت ${petPower()} · انرژی ${p.energy}</small></div><span>⚔️</span></div><button class="primary" onclick="startPetMatch()">⚔️ وارد آرنا شو</button>`;
}
function buyPet(id){const x=PETS.find(z=>z.id===id);if(!x)return;if(data.pet.id!==id&&!data.petItems.includes("pet_"+id)){if(data.coins<x.price)return toast("🪙 سکه کافی نیست.");data.coins-=x.price;data.petItems.push("pet_"+id)}data.pet.id=id;data.pet.energy=100;save();renderPetUI();setTimeout(renderPet3D,30);toast(`${x.emoji} ${x.name} آماده نبرده!`)}
function buyPetItem(id){const x=PET_ITEMS.find(z=>z.id===id);if(!x)return;if(data.petItems.includes(id))return;if(data.coins<x.price)return toast("🪙 سکه کافی نیست.");data.coins-=x.price;data.petItems.push(id);if(x.slot==='weapon')data.pet.weapon=id;else data.pet.armor=id;save();renderPetUI();setTimeout(renderPet3D,30);toast(`${x.emoji} ${x.name} روی پتت نصب شد!`)}
function upgradePet(){const p=data.pet,need=p.level*100;if(p.xp<need)return toast(`برای ارتقا ${need-p.xp} XP دیگه لازم داری.`);p.xp-=need;p.level++;p.energy=100;save();renderPetUI();setTimeout(renderPet3D,30);toast(`🎉 ${PETS.find(x=>x.id===p.id).name} رفت لول ${p.level}!`)}
function petBattleReward(win){const p=data.pet;p.xp+=win?55:25;p.energy=Math.max(0,p.energy-(win?12:7));if(win){p.wins++;data.coins+=35}if(p.xp>=p.level*100)upgradePet();save();renderPetUI()}
function startPetMatch(){if((data.pet.energy||0)<10)return toast("🔋 پتت انرژی کمی داره؛ کمی استراحت کن.");connect(()=>{const status=$("#petMatchStatus");if(status)status.textContent="🔎 در حال پیدا کردن حریف تصادفی...";ws.send(JSON.stringify({type:"pet_queue",name:data.name,pet:{id:data.pet.id,level:data.pet.level,power:petPower(),emoji:(PETS.find(x=>x.id===data.pet.id)||PETS[0]).emoji}}))});show("profile")}
function renderPetBattle(d){const status=$("#petMatchStatus");if(!status)return;status.innerHTML=`<div class="pet-vs"><div>${data.pet.emoji}<small>${data.pet.name}</small></div><b>VS</b><div>${d.opponent.emoji}<small>${d.opponent.name}</small></div></div><div class="battle-log" id="petBattleLog">⚔️ مبارزه شروع شد...</div>`;let i=0;const logs=d.rounds||[];const t=setInterval(()=>{const el=$("#petBattleLog");if(!el){clearInterval(t);return}if(i<logs.length){el.textContent=logs[i++]}else{clearInterval(t);const win=d.winner===d.you;el.textContent=win?`🏆 بردی! +55 XP و +35 سکه`:`💫 این بار حریف برد؛ +25 XP`;petBattleReward(win);toast(win?"🏆 پتت برنده شد!":"💫 مسابقه تموم شد")}},700)}
function quickStart(){ window.GWAudio.start();openGameScreen("reaction")}
window.addEventListener("resize",()=>setTimeout(renderPet3D,80));
$("#playerName").value=data.name;renderGames();renderShop();renderPetUI();updateUI();updateSoundButton();initSetup();connect();setTimeout(renderPet3D,300);$("#gwChatSend")?.addEventListener("click",()=>GWSocial.send());$("#gwChatInput")?.addEventListener("keydown",e=>{if(e.key==="Enter")GWSocial.send()});

window.renderGW10Extras=function(){
  const games=document.getElementById("gameList")||document.querySelector(".game-list");
  if(!games||document.getElementById("gw10Extra"))return;
  const box=document.createElement("section");box.id="gw10Extra";box.className="gw10-extra";
  box.innerHTML=`<div class="gw10-head"><div><small>برای تو</small><h3>بازی‌های پیشنهادی</h3></div><span>✨</span></div>
  <div class="gw10-pills"><button data-gwjump="reaction">⚡ سریع</button><button data-gwjump="memory">🧠 فکری</button><button data-gwjump="cards">🃏 کارت</button><button data-gwjump="mafia">🕵️ گروهی</button></div>`;
  games.parentNode.insertBefore(box,games);
  box.querySelectorAll("[data-gwjump]").forEach(b=>b.onclick=()=>{if(typeof window.launchGame==="function")window.launchGame(b.dataset.gwjump);else if(typeof window.playGame==="function")window.playGame(b.dataset.gwjump)});
};
document.addEventListener("DOMContentLoaded",()=>setTimeout(()=>window.renderGW10Extras?.(),150));

window.GW11AddControls=function(){
  const host=document.querySelector("#play .game-area,.game-area");
  if(!host||document.getElementById("gw11Controls"))return;
  const bar=document.createElement("div");bar.id="gw11Controls";bar.className="gw11-controls";
  bar.innerHTML=`<button id="gw11Fav">☆ علاقه‌مندی</button><button id="gw11Sound">🔊 صدا</button><button id="gw11Again">↻ دوباره</button>`;
  host.prepend(bar);
  document.getElementById("gw11Fav").onclick=()=>{GW11.favorite(window.currentGameId||"game")};
  document.getElementById("gw11Sound").onclick=()=>{if(window.GWAudio){GWAudio.setMuted(!GWAudio.isMuted());document.getElementById("gw11Sound").textContent=GWAudio.isMuted()?"🔇 صدا":"🔊 صدا"}};
  document.getElementById("gw11Again").onclick=()=>{const id=window.currentGameId;if(typeof window.launchGame==="function"&&id)window.launchGame(id);else GW11.toast("بازی را دوباره شروع کن")};
};
document.addEventListener("DOMContentLoaded",()=>setTimeout(GW11AddControls,250));

window.GWReplayUI=function(){
  GWReplay.render();
  if(document.getElementById("gwReplay"))return;
  const host=document.querySelector("#home .hero,.hero")||document.querySelector("#home");
  if(!host)return;
  const card=document.createElement("div");card.id="gwReplay";card.className="gw-replay-card";
  host.appendChild(card);GWReplay.render();
};
document.addEventListener("DOMContentLoaded",()=>setTimeout(GWReplayUI,180));


/* GW14_FINAL_LAUNCH_PATCH */
setTimeout(()=>{
 if(window.__gw14FinalPatch)return;
 const originalLaunch=window.launch;
 if(typeof originalLaunch==='function'){
  window.launch=function(id){
   if(id==='number')return gw14NumberRush(document.getElementById('gameArea'));
   if(id==='memory')return gw14Memory(document.getElementById('gameArea'));
   return originalLaunch(id);
  };
  window.__gw14FinalPatch=true;
 }
},0);

/* GW18_PARTY_AI */
window.GWParty={
  modeNow:'truth', room:null, questions:[], index:0,
  async loadDaily(force=false){
    const day=new Date().toISOString().slice(0,10);
    const cacheKey='gw18_daily_'+day;
    if(!force){try{const c=JSON.parse(localStorage.getItem(cacheKey)||'null');if(c?.text){this.renderQuestion(c);return;}}catch(e){}}
    const el=document.getElementById('dailyQuestionText'); if(el)el.textContent='🤖 AI دارد سوال امروز را می‌سازد…';
    try{
      const r=await fetch('/api/daily-question',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:this.modeNow})});
      const d=await r.json();
      if(d?.question){localStorage.setItem(cacheKey,JSON.stringify(d.question));this.renderQuestion(d.question)}
      else throw new Error();
    }catch(e){
      const fallback={date:day,mode:this.modeNow,text:this.modeNow==='dare'?'یک حرکت بامزه و کاملاً امن برای ۳۰ ثانیه اجرا کن؛ بدون خطر، دردسر یا انتشار اطلاعات شخصی.':'اگر می‌توانستی یک مهارت جدید را همین امروز یاد بگیری، چه چیزی انتخاب می‌کردی و چرا؟'};
      this.renderQuestion(fallback);
    }
  },
  renderQuestion(q){const el=document.getElementById('dailyQuestionText');if(el)el.textContent=q.text||q.question||'سوال آماده است!';const d=document.getElementById('dailyQuestionDate');if(d)d.textContent=q.date||'امروز';},
  async newQuestion(){await this.loadDaily(true);toast('🤖 سوال تازه آماده شد!')},
  mode(m){this.modeNow=m;this.loadDaily(true);toast(m==='truth'?'🫣 حالت حقیقت':'🎯 چالش دوستانه')},
  answer(m){this.modeNow=m==='dare'?'dare':'truth';this.loadDaily(true)},
  create(){this.roomAction('create')},
  join(){const code=prompt('کد اتاق را وارد کن:');if(code)this.roomAction('join',code)},
  roomAction(action,code){connect(()=>{const name=data.name||'Player';ws.send(JSON.stringify({type:'name',name}));ws.send(JSON.stringify(action==='create'?{type:'create',game:'party'}:{type:'join',room:String(code).toUpperCase()}));});show('games')},
  onRoom(d){this.room=d.room;const s=document.getElementById('partyRoomStatus');if(s)s.textContent=`اتاق ${d.room} فعال است · ${d.players.length} نفر`;const p=document.getElementById('partyPlayers');if(p)p.innerHTML=d.players.map(x=>`<span>👤 ${escChat(x.name)}</span>`).join('')}
};
document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>GWParty.loadDaily(),300));


/* GW20_DYNAMIC_WORLD_TIME */
window.GWWorldTime={
  lastMinute:null,lastSunsetKey:null,
  init(){
    this.tick(); setInterval(()=>this.tick(),15000);
  },
  phase(h,m){
    const t=h+m/60;
    if(t>=6 && t<7) return 'dawn';
    if(t>=7 && t<17) return 'day';
    if(t>=17 && t<20) return 'sunset';
    return 'night';
  },
  tick(){
    const now=new Date(), h=now.getHours(), m=now.getMinutes(), phase=this.phase(h,m);
    const body=document.body; body.classList.remove('gw-day','gw-night','gw-sunset','gw-dawn'); body.classList.add('gw-'+phase);
    const clock=document.getElementById('gwTimeClock'), label=document.getElementById('gwTimeLabel'), icon=document.getElementById('gwTimeIcon');
    if(clock)clock.textContent=now.toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit'});
    const labels={dawn:['🌅','طلوع'],day:['☀️','روز'],sunset:['🌇','غروب'],night:['🌙','شب']};
    if(label)label.textContent=labels[phase][1]; if(icon)icon.textContent=labels[phase][0];
    const key=now.toLocaleDateString('en-CA');
    if(h===17 && m===0 && this.lastSunsetKey!==key){this.lastSunsetKey=key;this.sunsetReward();}
    this.lastMinute=h+':'+m;
  },
  sunsetReward(){
    if(!window.data)return;
    const rewardKey='gwSunsetReward_'+new Date().toLocaleDateString('en-CA');
    if(localStorage.getItem(rewardKey))return;
    localStorage.setItem(rewardKey,'1'); data.coins=(data.coins||0)+75; data.xp=(data.xp||0)+40; save();
    const el=document.createElement('div');el.className='gw-sunset-event';el.innerHTML='<div class="gw-sunset-card"><div style="font-size:42px">🌇✨</div><h2>پاداش غروب!</h2><p>امروز موقع غروب آنلاین بودی.</p><b>+۷۵ سکه · +۴۰ XP</b></div>';document.body.appendChild(el);
    requestAnimationFrame(()=>el.classList.add('show'));setTimeout(()=>{el.classList.remove('show');setTimeout(()=>el.remove(),900)},4500);
    toast('🌇 پاداش غروب دریافت شد! +۷۵ سکه');
  }
};
document.addEventListener('DOMContentLoaded',()=>GWWorldTime.init());
