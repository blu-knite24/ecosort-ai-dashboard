import mqtt from 'mqtt';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
export function createSimulator(config={}) {
  const prefix=config.topicPrefix ?? 'ecosort/device01';
  const client=mqtt.connect(config.mqttUrl ?? 'mqtt://localhost:1883',{username:config.mqttUsername,password:config.mqttPassword,clientId:`ecosort-simulator-${randomUUID()}`,reconnectPeriod:2000,will:{topic:`${prefix}/status`,payload:JSON.stringify({online:false,machineState:'unknown',simulated:true}),qos:1,retain:false}});
  let machine='stopped';let timer;const counts={plastic:0,paper:0,metal:0,biodegradable:0};const weights={plastic:0,paper:0,metal:0,biodegradable:0};const seen=new Map();
  const publish=(kind,body,retain=false)=>client.publish(`${prefix}/${kind}`,JSON.stringify({eventId:randomUUID(),ts:Date.now(),simulated:true,...body}),{qos:1,retain});
  const tick=()=> {
    if (!client.connected) return;
    const categories=Object.keys(counts);const category=categories[Math.floor(Math.random()*4)];const active=machine==='running';const grams=Math.round(10+Math.random()*80);
    if (active) {counts[category]++;weights[category]+=grams/1000;publish('classification',{object:{plastic:'PET bottle',paper:'Cardboard piece',metal:'Tin container',biodegradable:'Vegetable peel'}[category],category,confidence:0.96,weightGrams:grams,sortResult:'sorted',status:'confirmed'});}
    publish('telemetry',{totalWeightKg:Object.values(weights).reduce((a,b)=>a+b,0),counts,moisturePercent:category==='biodegradable'?67:21,metalDetected:active && category==='metal',objectDetected:active,conveyorState:machine,sorterState:active?'actuating':'idle'});
    publish('bins',{bins:categories.map(category=>({category,fillPercent:Math.min(100,weights[category]/20*100),weightKg:weights[category],capacityKg:20}))});
    publish('status',{online:true,machineState:machine,devices:[['esp32','ESP32 controller','controller'],['camera','Camera and AI processor','camera'],['metal','Metal detection sensor','sensor'],['moisture','Moisture sensor','sensor'],['ir','IR object detection sensor','sensor'],['conveyor','Conveyor motor','motor'],['servo','Servo sorting mechanism','servo']].map(([id,name,kind])=>({id,name,kind,online:true,lastSeen:Date.now(),telemetry:{source:'MQTT simulation'}}))});
  };
  client.on('connect',()=>{client.subscribe(`${prefix}/command`,{qos:1});tick();timer ??= setInterval(tick,config.intervalMs ?? 2500);});
  client.on('error',()=>console.error('Simulator MQTT connection unavailable; retrying'));
  client.on('message',(_topic,bytes,packet)=>{try {const c=JSON.parse(bytes.toString());if(packet.retain || c.simulated!==true || !['start','pause','resume','stop'].includes(c.command) || typeof c.commandId!=='string' || Date.now()-c.issuedAt>10000)return;
    if(seen.has(c.commandId)){publish('ack',seen.get(c.commandId));return;}
    machine={start:'running',pause:'paused',resume:'running',stop:'stopped'}[c.command];const ack={commandId:c.commandId,success:true,machineState:machine,message:'Simulated device ACK'};seen.set(c.commandId,ack);if(seen.size>100)seen.delete(seen.keys().next().value);setTimeout(()=>{publish('ack',ack);tick();},config.ackDelayMs ?? 500);
  }catch {console.warn('Simulator rejected malformed command');}});
  return {client,async close(){clearInterval(timer);publish('status',{online:false,machineState:'unknown'});await client.endAsync();}};
}
if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const simulator=createSimulator({mqttUrl:process.env.MQTT_URL,mqttUsername:process.env.MQTT_USERNAME,mqttPassword:process.env.MQTT_PASSWORD,topicPrefix:process.env.MQTT_TOPIC_PREFIX});
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await simulator.close();process.exit(0);});
}