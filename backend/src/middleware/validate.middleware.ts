/**
 * Validation Middleware
 *
 * Generic middleware for validating request data using Zod schemas
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { getLogger } from '../config/logger';

const logger = getLogger('validation-middleware');

/**
 * Validate request body
 */
export function validateBody(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn({
          errors: error.errors,
          path: req.path,
          body: req.body
        }, 'Request body validation failed');

        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
        return;
      }

      logger.error({ error }, 'Unexpected validation error');
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  };
}

/**
 * Validate query parameters
 */
export function validateQuery(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = await schema.parseAsync(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn({
          errors: error.errors,
          path: req.path,
          query: req.query
        }, 'Query parameter validation failed');

        res.status(400).json({
          success: false,
          message: 'Invalid query parameters',
          errors: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
        return;
      }

      logger.error({ error }, 'Unexpected validation error');
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  };
}

/**
 * Validate route parameters
 */
export function validateParams(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = await schema.parseAsync(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn({
          errors: error.errors,
          path: req.path,
          params: req.params
        }, 'Route parameter validation failed');

        res.status(400).json({
          success: false,
          message: 'Invalid route parameters',
          errors: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
        return;
      }

      logger.error({ error }, 'Unexpected validation error');
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  };
}

export default {
  validateBody,
  validateQuery,
  validateParams,
};
