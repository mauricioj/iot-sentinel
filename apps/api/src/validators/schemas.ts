import * as yup from "yup";

export const loginSchema = yup.object({
  email: yup.string().email().required(),
  password: yup.string().required()
});

export const refreshSchema = yup.object({
  refreshToken: yup.string().required()
});

export const createUserSchema = yup.object({
  name: yup.string().min(2).required(),
  email: yup.string().email().required(),
  password: yup.string().min(6).required(),
  isAdmin: yup.boolean().default(false),
  isActive: yup.boolean().default(true)
});

export const deviceTypeSchema = yup.object({
  name: yup.string().required(),
  category: yup.string().required(),
  default_protocols: yup.array(yup.string().required()).default([])
});

export const buildingSchema = yup.object({
  name: yup.string().required(),
  notes: yup.string().nullable().optional()
});

export const locationSchema = yup.object({
  building_id: yup.string().uuid().required(),
  path: yup.string().required(),
  details: yup.string().nullable().optional()
});

export const deviceSchema = yup.object({
  name: yup.string().required(),
  device_type_id: yup.string().uuid().required(),
  location_id: yup.string().uuid().required(),
  status: yup.string().oneOf(["online", "offline", "unknown"]).default("unknown"),
  last_seen_at: yup.date().nullable().optional(),
  notes: yup.string().nullable().optional(),
  tags: yup.array(yup.string().required()).default([])
});

export const interfaceSchema = yup.object({
  mac: yup.string().required(),
  interface_type: yup.string().required(),
  vendor: yup.string().nullable().optional(),
  last_ip: yup.string().nullable().optional()
});

export const registerHostSchema = yup.object({
  name: yup.string().required(),
  device_type_id: yup.string().uuid().required(),
  location_id: yup.string().uuid().required(),
  notes: yup.string().nullable().optional(),
  tags: yup.array(yup.string().required()).default([])
});
