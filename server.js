const express = require("express");
const http = require("http");
const path = require("path");
const WebSocket = require("ws");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const PORT = process.env.PORT || 3000;

app.disable("x-powered-by");
app.use(express.json({limit:"32kb"}));
app.use((req,res,next)=>{
  res.setHeader("X-Content-Type-Options","nosniff");
  res.setHeader("X-Frame-Options","DENY");
  res.setHeader("Referrer-Policy","no-referrer");
  res.setHeader("Permissions-Policy","camera=(self), microphone=(self), geolocation=()");
  res.setHeader("Cross-Origin-Opener-Policy","same-origin");
  res.setHeader("Cross-Origin-Resource-Policy","same-origin");
  next();
});
app.use(express.static(path.join(__dirname, "public"), {etag:true, maxAge:"1h"}));

const rooms = new Map();
const clients = new Map();
const petQueue = [];

function send(ws, data) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
}

function broadcast(room, data) {
  room.players.forEach(p => send(p.ws, data));
}

function newId() {
  return crypto.randomBytes(5).toString("hex").toUpperCase();
}

function cleanName(value){
  return String(value ?? "Player").replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0,20) || "Player";
}
function cleanRoom(value){
  return String(value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0,10);
}

const wsRate = new WeakMap();
function allowMessage(ws, limit=35, windowMs=10000){
  const now=Date.now(); let x=wsRate.get(ws);
  if(!x || now-x.start>=windowMs){ x={start:now,count:0}; wsRate.set(ws,x); }
  x.count++; return x.count<=limit;
}

function removePetQueue(ws){ for(let i=petQueue.length-1;i>=0;i--) if(petQueue[i].ws===ws) petQueue.splice(i,1); }
function petPower(p){ return Math.max(1,Math.min(500,Number(p?.power)||1)); }
function petMatch(a,b){
  const pa=petPower(a.pet),pb=petPower(b.pet),rounds=[];let sa=0,sb=0;
  for(let r=1;r<=5;r++){const chance=pa/(pa+pb);const aw=Math.random()<chance;if(aw)sa++;else sb++;rounds.push(`⚔️ راند ${r}: ${aw?a.name:b.name} ضربه زد — ${sa} : ${sb}`)}
  const winner=sa===sb?(Math.random()<pa/(pa+pb)?a:b):(sa>sb?a:b);
  return {type:"pet_match",you:a.id,opponent:{id:b.id,name:b.name,emoji:b.pet?.emoji||"🐾",level:Math.max(1,Number(b.pet?.level)||1),power:pb},rounds,winner:winner.id};
}
function queuePet(ws,info){
  removePetQueue(ws);petQueue.push({ws,id:clients.get(ws)?.id,name:String(info?.name||"Player").slice(0,20),pet:info?.pet||{}});send(ws,{type:"pet_wait"});
  if(petQueue.length>=2){const a=petQueue.shift(),b=petQueue.shift();send(a.ws,petMatch(a,b));send(b.ws,petMatch(b,a));}
}

function leave(ws) {
  removePetQueue(ws);
  const player = clients.get(ws);
  if (!player) return;

  const room = rooms.get(player.room);

  if (room) {
    room.players = room.players.filter(p => p.ws !== ws);
    broadcast(room, {
      type: "room",
      room: room.id,
      players: room.players.map(p => ({ id: p.id, name: p.name }))
    });
    if (!room.players.length) rooms.delete(room.id);
  }

  player.room = null;
}

wss.on("connection", ws => {
  const player = { id: newId(), name: "Player", room: null, ws };
  clients.set(ws, player);

  send(ws, { type: "connected", id: player.id });

  ws.on("message", raw => {
    if(Buffer.byteLength(raw) > 24*1024) { send(ws,{type:"error",message:"درخواست بیش از حد بزرگ است."}); return; }
    if(!allowMessage(ws)) { send(ws,{type:"error",message:"درخواست‌ها خیلی سریع ارسال شدند؛ کمی صبر کن."}); return; }
    try {
      const data = JSON.parse(raw.toString());

      if (data.type === "chat") {
        const text = String(data.text || "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, 300);
        if (!text) return;
        const room = rooms.get(player.room);
        if (!room) { send(ws, {type:"error", message:"اول وارد یک اتاق شو."}); return; }
        broadcast(room, {type:"chat", id:player.id, name:player.name, text});
        return;
      }

      if (data.type === "voice_signal") {
        const room = rooms.get(player.room);
        if (!room) return;
        if (data.signal && JSON.stringify(data.signal).length > 12000) return;
        broadcast(room, {type:"voice_signal", from:player.id, signal:data.signal||null});
        return;
      }

      if (data.type === "name") {
        player.name = cleanName(data.name);
        return;
      }

      if (data.type === "create") {
        leave(ws);
        const room = { id: newId(), players: [] };
        rooms.set(room.id, room);
        room.players.push(player);
        player.room = room.id;

        send(ws, { type: "created", room: room.id });
        broadcast(room, {
          type: "room",
          room: room.id,
          players: room.players.map(p => ({ id: p.id, name: p.name }))
        });
        return;
      }

      if (data.type === "join") {
        const id = cleanRoom(data.room);
        const room = rooms.get(id);

        if (!room) {
          send(ws, { type: "error", message: "این Room وجود ندارد." });
          return;
        }

        if (room.players.length >= 8) {
          send(ws, { type: "error", message: "این Room پر است." });
          return;
        }

        leave(ws);
        room.players.push(player);
        player.room = room.id;

        broadcast(room, {
          type: "room",
          room: room.id,
          players: room.players.map(p => ({ id: p.id, name: p.name }))
        });

        if (room.players.length === 2) broadcast(room, { type: "ready" });
        return;
      }

      if (data.type === "pet_queue") { queuePet(ws,data); return; }

      if (data.type === "leave") {
        leave(ws);
        return;
      }

      if (data.type === "game") {
        const room = rooms.get(player.room);
        if (!room) return;
        broadcast(room, { type: "game", from: player.id, payload: data.payload || {} });
      }
    } catch {
      send(ws, { type: "error", message: "درخواست نامعتبر است." });
    }
  });

  ws.on("close", () => leave(ws));
});

app.get("/api/status", (req, res) => {
  res.json({ online: true, version: "18.0.0", rooms: rooms.size, players: clients.size, petQueue: petQueue.length, capacity: 8 });
});


const httpRate = new Map();
function httpLimit(key, limit=20, windowMs=60000){
  const now=Date.now(); let x=httpRate.get(key);
  if(!x || now-x.start>=windowMs){x={start:now,count:0};httpRate.set(key,x);}
  x.count++; return x.count<=limit;
}
function clientKey(req){ return String(req.headers["x-forwarded-for"]||req.socket.remoteAddress||"unknown").split(",")[0].trim().slice(0,80); }

const dailyQuestionCache = new Map();
const safePartyFallback = {
  truth: ["اگر می‌توانستی یک مهارت جدید را همین امروز یاد بگیری، چه چیزی انتخاب می‌کردی؟","آخرین چیزی که واقعاً خنداندت چه بود؟","اگر یک روز مدیر GameWorld بودی، چه قابلیتی اضافه می‌کردی؟"],
  dare: ["یک صدای بامزه برای ۱۰ ثانیه اجرا کن؛ بدون کار خطرناک یا خجالت‌آور.","با سه کلمه یک داستان خیلی کوتاه و خنده‌دار بساز.","یک حرکت خلاقانه و کاملاً امن برای جمع اجرا کن."]
};
app.post("/api/daily-question", async (req,res)=>{
  if(!httpLimit("daily:"+clientKey(req), 12, 60000)) return res.status(429).json({error:"درخواست‌های زیادی ارسال شده؛ کمی بعد دوباره تلاش کن."});
  try{
    const mode=String(req.body?.mode||"truth")==="dare"?"dare":"truth";
    const day=new Date().toISOString().slice(0,10), key=day+":"+mode;
    if(dailyQuestionCache.has(key)) return res.json({ok:true,question:dailyQuestionCache.get(key)});
    if(!process.env.OPENAI_API_KEY){
      const list=safePartyFallback[mode], text=list[Math.floor(Math.random()*list.length)];
      const q={date:day,mode,text}; dailyQuestionCache.set(key,q); return res.json({ok:true,fallback:true,question:q});
    }
    const prompt=mode==="dare"
      ? "برای یک بازی دوستانه نوجوانان، یک جرئت کاملاً امن، کوتاه، خنده‌دار و بدون خطر، بدون محتوای جنسی، مواد، آسیب، تحقیر یا درخواست اطلاعات خصوصی بنویس. فقط خود سوال را بده."
      : "برای یک بازی دوستانه نوجوانان، یک سوال حقیقت بامزه و محترمانه بنویس؛ بدون محتوای جنسی، آسیب، مواد یا درخواست اطلاعات خصوصی. فقط خود سوال را بده.";
    const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${process.env.OPENAI_API_KEY}`},body:JSON.stringify({model:process.env.OPENAI_MODEL||"gpt-5.6-luna",instructions:"تو طراح سوال روز GameWorld هستی. سوال‌ها باید مناسب نوجوانان، امن، غیرجنسی، غیرخطرناک و قابل بازی در جمع دوستان باشند.",input:prompt,max_output_tokens:120})});
    if(!r.ok) throw new Error("ai");
    const out=await r.json(), text=String(out.output_text||"").trim();
    if(!text) throw new Error("empty");
    const q={date:day,mode,text}; dailyQuestionCache.set(key,q); res.json({ok:true,question:q});
  }catch(e){
    const mode=String(req.body?.mode||"truth")==="dare"?"dare":"truth", day=new Date().toISOString().slice(0,10), list=safePartyFallback[mode], text=list[Math.floor(Math.random()*list.length)];
    res.json({ok:true,fallback:true,question:{date:day,mode,text}});
  }
});

// GameWorld AI endpoint. Keep OPENAI_API_KEY only on the server/environment.
app.post("/api/ai", async (req,res)=>{
  if(!httpLimit("ai:"+clientKey(req), 12, 60000)) return res.status(429).json({error:"درخواست‌های AI زیاد شده؛ کمی بعد دوباره تلاش کن."});
  try{
    const message=String(req.body?.message||"").trim();
    if(!message) return res.status(400).json({error:"پیام خالی است."});
    if(message.length>1200) return res.status(400).json({error:"پیام بیش از حد طولانی است."});
    if(!process.env.OPENAI_API_KEY){
      return res.json({ok:true,fallback:true,answer:"فعلاً حالت آفلاین GameWorld فعاله. برای فعال شدن هوش مصنوعی، مدیر سایت باید OPENAI_API_KEY را فقط روی سرور تنظیم کند."});
    }
    const r=await fetch("https://api.openai.com/v1/responses",{
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":`Bearer ${process.env.OPENAI_API_KEY}`},
      body:JSON.stringify({
        model:process.env.OPENAI_MODEL||"gpt-5.6-luna",
        instructions:"تو دستیار رسمی GameWorld هستی. فارسی روان، دوستانه و کاربردی جواب بده. درباره بازی‌ها، پت‌ها، پروفایل، فروشگاه، Arena، چت و امکانات GameWorld کمک کن. برای بازیکن نوجوان پاسخ امن و مناسب بده؛ اطلاعات شخصی، تماس خصوصی یا دور زدن محدودیت‌ها را درخواست نکن. اگر چیزی را نمی‌دانی حدس نزن. پاسخ‌ها را کوتاه و مرحله‌ای نگه دار.",
        input:message,
        max_output_tokens:500
      })
    });
    if(!r.ok) return res.status(502).json({error:"پاسخ سرویس هوش مصنوعی در دسترس نیست."});
    const data=await r.json();
    const answer=data.output_text||"پاسخی دریافت نشد.";
    res.json({ok:true,answer});
  }catch(e){res.status(500).json({error:"خطای موقت دستیار GameWorld."})}
});

app.get("/api/health", (req,res)=>res.json({ok:true,service:"GameWorld"}));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

server.listen(PORT, () => console.log(`GameWorld running on port ${PORT}`));
