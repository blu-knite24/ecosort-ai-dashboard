import { z } from "zod";
import { CATEGORIES } from "./types";
export const classificationInput = z.object({id:z.string().min(1),ts:z.number().finite().positive(),object:z.string().min(1).max(160),category:z.enum(CATEGORIES),confidence:z.number().min(0).max(1),weightGrams:z.number().finite().min(0),sortResult:z.enum(["sorted","failed","pending"]),status:z.enum(["confirmed","low_confidence","error"]),simulated:z.boolean()});
export const telemetryInput = z.object({ts:z.number().finite().positive(),totalWeightKg:z.number().min(0),counts:z.object({plastic:z.number().int().min(0),paper:z.number().int().min(0),metal:z.number().int().min(0),biodegradable:z.number().int().min(0)}),moisturePercent:z.number().min(0).max(100).nullable(),metalDetected:z.boolean().nullable(),objectDetected:z.boolean().nullable(),conveyorState:z.string().nullable(),sorterState:z.string().nullable()});
export const binsInput = z.array(z.object({category:z.enum(CATEGORIES),fillPercent:z.number().min(0).max(100),weightKg:z.number().min(0),capacityKg:z.number().positive(),updatedAt:z.number().finite().positive()}));
export const machineInput = z.enum(["running","paused","stopped","fault","unknown"]);
export const ackInput = z.object({commandId:z.string().min(1),success:z.boolean(),machineState:machineInput.optional(),message:z.string().optional()});
export function mergeHistory(current:z.infer<typeof classificationInput>[], incoming:z.infer<typeof classificationInput>[]) {
  return [...new Map([...incoming,...current].map(c=>[c.id,c])).values()].sort((a,b)=>b.ts-a.ts).slice(0,20000);
}