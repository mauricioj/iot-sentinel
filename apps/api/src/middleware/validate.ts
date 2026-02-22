import { FastifyReply, FastifyRequest } from "fastify";
import { AnyObjectSchema } from "yup";

export function validateBody<T>(schema: AnyObjectSchema) {
  return async (request: FastifyRequest<{ Body: T }>, reply: FastifyReply) => {
    try {
      request.body = (await schema.validate(request.body, {
        abortEarly: false,
        stripUnknown: true
      })) as T;
    } catch (error) {
      return reply.code(400).send({ message: "Validation failed", error });
    }
  };
}
