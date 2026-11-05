import { createGateway } from './gateway.mjs';
const config={apiToken:process.env.API_TOKEN,mqttUrl:process.env.MQTT_URL,mqttUsername:process.env.MQTT_USERNAME,mqttPassword:process.env.MQTT_PASSWORD,topicPrefix:process.env.MQTT_TOPIC_PREFIX,dbPath:process.env.DB_PATH,origins:(process.env.CORS_ORIGINS ?? 'http://localhost:8080').split(',').map(s=>s.trim()),heartbeatMs:Number(process.env.HEARTBEAT_TIMEOUT_SEC ?? 15)*1000,ackMs:Number(process.env.ACK_TIMEOUT_SEC ?? 10)*1000};
const gateway=createGateway(config);
await gateway.listen(Number(process.env.PORT ?? 4000));
console.log('EcoSort gateway listening; hardware and simulation streams isolated');
for (const signal of ['SIGINT','SIGTERM']) process.once(signal,async()=>{await gateway.close();process.exit(0);});