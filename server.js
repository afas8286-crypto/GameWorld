import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
const __filename=fileURLToPath(import.meta.url),__dirname=path.dirname(__filename);
const app=express();app.use(cors());app.use(express.json());app.use(express.static(__dirname));
const db={users:new Map(),events:new Map(),leaderboard:[]};
function hash(v){return crypto.createHash('sha256').update(String(v)).digest('hex')}
function requireOwner(req,res,next){const key=req.headers['x-owner-key'];if(!key||key!==process.env.GAMEWORLD_OWNER_KEY)return res.status(401).json({error:'owner_required'});next()}
app.get('/api/health',(req,res)=>res.json({ok:true,service:'GameWorld',time:new Date().toISOString()}));
app.get('/api/config',(req,res)=>res.json({ageMax:100,petCount:13,features:['arena','daily-spin','surprise-drop','monthly-events','collection','top20']}));
app.get('/api/leaderboard',(req,res)=>res.json({items:db.leaderboard.slice(0,20)}));
app.post('/api/rooms',(req,res)=>{const id=crypto.randomUUID().slice(0,8);res.status(201).json({id,name:req.body.name||'GameWorld Room',capacity:req.body.capacity||2,joinCode:hash(id).slice(0,6)});});
app.post('/api/owner/events',requireOwner,(req,res)=>{const id=crypto.randomUUID();db.events.set(id,{id,...req.body,createdAt:new Date().toISOString()});res.status(201).json(db.events.get(id));});
app.get('/api/owner/events',requireOwner,(req,res)=>res.json([...db.events.values()]));
app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'index.html')));
const port=process.env.PORT||3000;app.listen(port,()=>console.log(`GameWorld running on http://localhost:${port}`));
