
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
{id:"reaction",name:"Reaction Rush",icon:"⚡",cat:"brain",desc:"واکنش خودت را در چند راند بسنج.",tag:"۱ نفر",difficulty:"سریع",time:"۲ دقیقه"},
{id:"memory",name:"Memory Grid",icon:"🧠",cat:"brain",desc:"جفت‌های مخفی را با کمترین حرکت پیدا کن.",tag:"۱ نفر",difficulty:"متوسط",time:"۳ دقیقه"},
{id:"number",name:"Number Rush",icon:"🔢",cat:"brain",desc:"عدد هدف را قبل از تمام شدن زمان پیدا کن.",tag:"۱ نفر",difficulty:"سریع",time:"۱ دقیقه"},
{id:"tictac",name:"دوز",icon:"⭕",cat:"party",desc:"یک نبرد کوتاه سه‌درسه.",tag:"۱–۲ نفر",difficulty:"متوسط",time:"۲ دقیقه"},
{id:"cards",name:"پاسور",icon:"🃏",cat:"cards",desc:"یک دست کارت سریع و ساده.",tag:"۱ نفر",difficulty:"آسان",time:"۲ دقیقه"},
{id:"war",name:"جنگ کارت‌ها",icon:"♠️",cat:"cards",desc:"کارت بکش و قدرت دستت را بسنج.",tag:"۱ نفر",difficulty:"متوسط",time:"۲ دقیقه"},
{id:"uno",name:"Uno Mini",icon:"🟨",cat:"cards",desc:"رنگ یا عدد مناسب را بازی کن.",tag:"۱ نفر",difficulty:"متوسط",time:"۲ دقیقه"},
{id:"mafia",name:"مافیا",icon:"🕵️",cat:"party",desc:"اتاق بساز و با دوستانت نقش بازی کن.",tag:"۴–۸ نفر",difficulty:"گروهی",time:"۱۰+ دقیقه"}
];
const SHOP=[
{id:"avatar1",emoji:"😎",name:"آواتار خفن",price:120},
{id:"avatar2",emoji:"👻",name:"آواتار روح",price:180},
{id:"frame",emoji:"💜",name:"قاب بنفش",price:250},
{id:"title",emoji:"🔥",name:"عنوان Fire",price:300},
{id:"crown",emoji:"👑",name:"تاج",price:500},
{id:"spark",emoji:"✨",name:"افکت Spark",price:350}
];
let data=JSON.parse(localStorage.getItem("gw4")||"null")||{name:"Player",xp:0,level:1,wins:0,games:0,coins:250,rating:1000,streak:0,mission:0,owned:[],ach:[]};
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
 set("profileGames",data.games);set("profileWins",data.wins);set("profileRating",data.rating);set("myRating",data.rating);set("profileStreak",data.streak);set("profileName",data.name);
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
function connect(cb){if(location.protocol==="file:"){toast("برای آنلاین باید با Node اجرا شود.");return}if(ws?.readyState===1){cb?.();return}if(ws?.readyState===0)return;const p=location.protocol==="https:"?"wss":"ws";ws=new WebSocket(`${p}://${location.host}`);ws.onopen=()=>{$("#onlineStatus").textContent="🟢 متصل";cb?.()};ws.onclose=()=>$("#onlineStatus").textContent="🔴 قطع شد";ws.onmessage=e=>{let d;try{d=JSON.parse(e.data)}catch{return;}if(d.type==="created"){$("#roomCode").value=d.room;toast("اتاق ساخته شد: "+d.room)}if(d.type==="room"){$("#roomPlayers").innerHTML=`<div class="room-code">ROOM ${d.room}</div>`+d.players.map(p=>`<div class="player-row">👤 ${p.name}</div>`).join("")}if(d.type==="ready")toast("بازیکن‌ها آماده‌اند!");if(d.type==="error")toast(d.message)}}
function createRoom(){if(!ws)return connect(createRoom);const n=$("#playerName").value.trim()||"Player";data.name=n;save();ws.send(JSON.stringify({type:"name",name:n}));ws.send(JSON.stringify({type:"create",game:currentGame||"mafia"}))}
function joinRoom(){if(!ws)return connect(joinRoom);const n=$("#playerName").value.trim()||"Player",r=$("#roomCode").value.trim();data.name=n;save();ws.send(JSON.stringify({type:"name",name:n}));ws.send(JSON.stringify({type:"join",room:r}))}
function renderShop(){$("#shopList").innerHTML=SHOP.map(x=>{const owned=data.owned.includes(x.id);return `<article class="shop-item"><div class="shop-emoji">${x.emoji}</div><b>${x.name}</b><p>🪙 ${x.price}</p><button class="${owned?"secondary":"primary"}" ${owned?"disabled":""} onclick="buy('${x.id}')">${owned?"خریداری شده":"خرید"}</button></article>`}).join("")}
function buy(id){const x=SHOP.find(z=>z.id===id);if(data.coins<x.price)return toast("سکه کافی نیست.");data.coins-=x.price;data.owned.push(id);if(id.startsWith("avatar"))$("#avatar").textContent=x.emoji;save();renderShop();toast("آیتم خریداری شد ✨")}
function quickStart(){ window.GWAudio.start();openGameScreen("reaction")}
$("#playerName").value=data.name;renderGames();renderShop();updateUI();updateSoundButton();connect();