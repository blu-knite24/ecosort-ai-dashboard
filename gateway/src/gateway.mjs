import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { createServer } from 'node:http';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { Server } from 'socket.io';
import mqtt from 'mqtt';
import { openDatabase } from './database.mjs';
import { schemas, commandSchema, categories } from './protocol.mjs';

export function createGateway(config) {
  if (!config.apiToken || config.apiToken.length < 32) throw new Error('API_TOKEN must contain at least 32 characters');
  const db = openDatabase(config.dbPath ?? 'data/ecosort.sqlite');
  const channels = new Map();
  const pending = new Map();
  const heartbeatMs = config.heartbeatMs ?? 15000;
  const ackMs = config.ackMs ?? 10000;
  const now = () => Date.now();
  for (const simulated of [false,true]) channels.set(simulated, {mqttConnected:false, deviceOnline:false, lastDeviceMessage:null, machineState:'unknown', telemetry:null, bins:db.getSnapshot('bins',simulated) ?? [], devices:[], simulated});
  const app = express();
  const http = createServer(app);
  const origins = config.origins ?? ['http://localhost:8080'];
  const corsOrigin = (origin, cb) => cb(null, !origin || origins.includes(origin));
  const io = new Server(http, {cors:{origin:corsOrigin}, allowRequest:(req, cb)=>cb(null,!req.headers.origin || origins.includes(req.headers.origin))});
  const room = simulated => simulated ? 'simulation' : 'hardware';
  const emit = (simulated, name, value) => io.to(room(simulated)).emit(name,value);
  const authorized = token => {
    if (typeof token !== 'string') return false;
    const a=Buffer.from(token), b=Buffer.from(config.apiToken);
    return a.length===b.length && timingSafeEqual(a,b);
  };
  app.use(helmet(), cors({origin:corsOrigin}), express.json({limit:'64kb'}));
  app.get('/health', (_req,res)=>res.json({ok:true}));
  app.use('/api', rateLimit({windowMs:60000,limit:240,standardHeaders:'draft-8',legacyHeaders:false}), (req,res,next)=>authorized(req.headers.authorization?.replace(/^Bearer /,'')) ? next() : res.status(401).json({error:'Unauthorized'}));
  const modeFor = req => req.query.simulated === 'true';
  app.get('/api/classifications', (req,res)=> {
    const limit=Math.min(20000,Math.max(1,Number(req.query.limit) || 20000));
    const from=req.query.from ? Date.parse(String(req.query.from)) : 0;
    const to=req.query.to ? Date.parse(String(req.query.to)) : Number.MAX_SAFE_INTEGER;
    const category=req.query.category ? String(req.query.category) : undefined;
    if (!Number.isFinite(from) || !Number.isFinite(to) || from>to || (category && !categories.includes(category))) return res.status(400).json({error:'Invalid history filters'});
    res.json(db.history({simulated:modeFor(req), limit,from,to,category,search:String(req.query.search ?? '').slice(0,160)}));
  });
  app.get('/api/snapshot',(req,res)=>res.json(channels.get(modeFor(req))));
  app.get('/api/analytics',(req,res)=> {
    const rows=db.history({simulated:modeFor(req)});
    const daily={}; const totals=Object.fromEntries(categories.map(c=>[c,{count:0,weightKg:0}]));
    for (const r of rows) {totals[r.category].count++;totals[r.category].weightKg+=r.weightGrams/1000;const day=new Date(r.ts).toISOString().slice(0,10);daily[day]=(daily[day] ?? 0)+r.weightGrams/1000;}
    res.json({totals,daily,records:rows.length,maxRecords:20000});
  });
  app.get('/api/commands/:id',(req,res)=>{const c=db.getCommand(req.params.id);return c ? res.json(c) : res.status(404).json({error:'Command not found'});});
  const client=mqtt.connect(config.mqttUrl ?? 'mqtt://localhost:1883', {username:config.mqttUsername,password:config.mqttPassword,clientId:`ecosort-gateway-${randomUUID()}`,reconnectPeriod:2000,connectTimeout:10000});
  const prefix=config.topicPrefix ?? 'ecosort/device01';
  const connection = simulated => {const s=channels.get(simulated);emit(simulated,'connection',{mqttConnected:s.mqttConnected,deviceOnline:s.deviceOnline,lastDeviceMessage:s.lastDeviceMessage});};
  function finish(id, state, message, ack) {
    const p=pending.get(id); if (!p) return false;
    clearTimeout(p.timer);pending.delete(id);
    db.command({...p.record,state,ackAt:now(),message});
    if (ack) emit(p.record.simulated,'ack',ack);
    else emit(p.record.simulated,'command_timeout',{commandId:id});
    return true;
  }
  app.post('/api/commands', rateLimit({windowMs:60000,limit:30}), (req,res)=> {
    const parsed=commandSchema.safeParse(req.body); if (!parsed.success) return res.status(400).json({error:'Invalid command'});
    const {command,simulated}=parsed.data; const s=channels.get(simulated);
    if (!client.connected || !s.deviceOnline || !s.lastDeviceMessage || now()-s.lastDeviceMessage>heartbeatMs) return res.status(503).json({error:'MQTT or device offline'});
    if ([...pending.values()].some(p=>p.record.simulated===simulated)) return res.status(409).json({error:'A command is still awaiting acknowledgement'});
    const id=randomUUID(); const record={id,command,simulated,sentAt:now(),state:'awaiting_ack'};
    db.command(record);
    const timer=setTimeout(()=>finish(id,'timeout','No acknowledgement from device'),ackMs);
    pending.set(id,{record,timer});
    client.publish(`${prefix}/command`,JSON.stringify({commandId:id,command,issuedAt:now(),simulated}),{qos:1,retain:false},error=> {if(error) finish(id,'error','MQTT publication failed',{commandId:id,success:false,message:'MQTT publication failed',simulated});});
    res.status(202).json({commandId:id,state:'awaiting_ack'});
  });
  io.use((socket,next)=> authorized(socket.handshake.auth.token) ? next() : next(new Error('Unauthorized')));
  io.on('connection',socket=> {const simulated=socket.handshake.auth.simulated === true;socket.join(room(simulated));socket.emit('snapshot',channels.get(simulated));});
  client.on('connect',()=> {client.subscribe(Object.keys(schemas).map(t=>`${prefix}/${t}`),{qos:1});for(const [simulated,s] of channels){s.mqttConnected=true;connection(simulated);}});
  const offline=()=>{for(const [simulated,s] of channels){s.mqttConnected=false;s.deviceOnline=false;s.machineState='unknown';s.devices=s.devices.map(d=>({...d,online:false}));connection(simulated);emit(simulated,'status',{machineState:'unknown'});emit(simulated,'devices',s.devices);}};
  client.on('offline',offline);client.on('close',offline);client.on('error',()=>console.error('MQTT connection error; retrying'));
  client.on('message',(topic,bytes,packet)=> {
    const kind=topic.slice(prefix.length+1); if (!schemas[kind] || bytes.length>65536) return;
    try {
      const parsed=schemas[kind].safeParse(JSON.parse(bytes.toString()));
      if (!parsed.success) {console.warn(`Rejected invalid ${kind} message`);return;}
      const data=parsed.data; const s=channels.get(data.simulated);
      // Retained old readings must never resurrect an offline device or replay an old classification.
      if (packet.retain && kind!=='status') return;
      if (kind==='ack') {
        const p=pending.get(data.commandId);
        if (!p || p.record.simulated!==data.simulated) return;
        if (finish(data.commandId,data.success?'acknowledged':'rejected',data.message,data) && data.success && data.machineState) {s.machineState=data.machineState;emit(data.simulated,'status',{machineState:s.machineState});}
        return;
      }
      if (kind!=='status' && !db.record(kind,data)) return;
      const fresh=now()-data.ts<=heartbeatMs && data.ts<=now()+5000;
      if (fresh) {s.lastDeviceMessage=now();s.deviceOnline=kind==='status' ? data.online : true;}
      if (kind==='status') {
        s.deviceOnline=fresh && data.online;
        s.machineState=s.deviceOnline ? data.machineState : 'unknown';
        if (data.devices) s.devices=data.devices.map(d=>({...d,online:d.online && s.deviceOnline}));
        emit(data.simulated,'status',{machineState:s.machineState});emit(data.simulated,'devices',s.devices);
      } else if (kind==='classification') emit(data.simulated,kind,data);
      else if (fresh && kind==='telemetry') {s.telemetry=data;emit(data.simulated,kind,data);}
      else if (kind==='bins') {s.bins=data.bins.map(b=>({...b,updatedAt:data.ts}));db.snapshot('bins',data.simulated,s.bins);emit(data.simulated,kind,s.bins);}
      connection(data.simulated);
    } catch {console.warn(`Rejected unreadable ${kind} message`);}
  });
  const watchdog=setInterval(()=> {for(const [simulated,s] of channels) if(s.deviceOnline && now()-s.lastDeviceMessage>heartbeatMs){s.deviceOnline=false;s.machineState='unknown';s.devices=s.devices.map(d=>({...d,online:false}));connection(simulated);emit(simulated,'status',{machineState:'unknown'});emit(simulated,'devices',s.devices);}},Math.min(1000,heartbeatMs));
  app.use((error,_req,res,_next)=>res.status(error.status ?? 500).json({error:error.status===400?'Invalid JSON':'Request failed'}));
  return {app,http,io,db,client,channels, async listen(port=4000,host='0.0.0.0'){await new Promise(resolve=>http.listen(port,host,resolve));return http.address();}, async close(){clearInterval(watchdog);for(const p of pending.values())clearTimeout(p.timer);pending.clear();await client.endAsync();await new Promise(resolve=>io.close(resolve));db.close();}};
}