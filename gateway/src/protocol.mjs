import { z } from 'zod';

export const categories = ['plastic', 'paper', 'metal', 'biodegradable'];
const category = z.preprocess(v => v === 'organic' || v === 'bio' ? 'biodegradable' : v, z.enum(categories));
const eventId = z.string().min(1).max(128);
const timestamp = z.preprocess(v => v === undefined ? Date.now() : typeof v === 'string' ? Date.parse(v) : v, z.number().finite().int().positive());
const source = { simulated: z.boolean().default(false) };
const event = { eventId, ts: timestamp, ...source };
export const machineState = z.enum(['running', 'paused', 'stopped', 'fault', 'unknown']);
export const commandSchema = z.object({ command: z.enum(['start', 'pause', 'resume', 'stop']), simulated: z.boolean().default(false) }).strict();
export const classificationSchema = z.object({
  ...event, object: z.string().min(1).max(160), category,
  confidence: z.number().min(0).max(1), weightGrams: z.number().finite().min(0).max(1000000),
  sortResult: z.enum(['sorted', 'failed', 'pending']).default('pending'),
  status: z.enum(['confirmed', 'low_confidence', 'error']).optional(),
}).transform(({eventId, ...r}) => ({...r, id: eventId, status: r.status ?? (r.confidence < 0.8 ? 'low_confidence' : 'confirmed')}));
const count = z.number().int().min(0);
export const telemetrySchema = z.object({
  ...event, totalWeightKg: z.number().finite().min(0),
  counts: z.object({ plastic: count, paper: count, metal: count, biodegradable: count.optional(), organic: count.optional() }).transform(c => ({plastic:c.plastic, paper:c.paper, metal:c.metal, biodegradable:c.biodegradable ?? c.organic ?? 0})),
  moisturePercent: z.number().min(0).max(100).nullable().default(null),
  metalDetected: z.boolean().nullable().default(null), objectDetected: z.boolean().nullable().default(null),
  conveyorState: z.string().max(40).nullable().default(null), sorterState: z.string().max(40).nullable().default(null),
});
export const binsSchema = z.object({ ...event, bins: z.array(z.object({category, fillPercent:z.number().min(0).max(100), weightKg:z.number().min(0), capacityKg:z.number().positive()})).max(4).refine(b => new Set(b.map(v => v.category)).size === b.length, 'Duplicate bins') });
export const statusSchema = z.object({ ...source, ts: timestamp, online:z.boolean(), machineState, devices: z.array(z.object({id:eventId, name:z.string().max(100), kind:z.string().max(40), online:z.boolean(), lastSeen:timestamp.nullable(), telemetry:z.record(z.union([z.string(), z.number().finite(), z.boolean()]))})).max(16).optional() });
export const ackSchema = z.object({commandId:eventId, success:z.boolean(), machineState:machineState.optional(), message:z.string().max(200).optional(), ...source});
export const schemas = {classification:classificationSchema, telemetry:telemetrySchema, bins:binsSchema, status:statusSchema, ack:ackSchema};