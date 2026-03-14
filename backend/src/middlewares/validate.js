import { errorResponse } from '../utils/apiResponse.js';

/**
 * Joi validation middleware factory.
 * @param {import('joi').ObjectSchema} schema - Joi schema
 * @param {'body'|'query'|'params'} source - Request property to validate
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], { abortEarly: false, stripUnknown: true });
    if (error) {
      const details = error.details.map((d) => d.message);
      return errorResponse(res, 'VALIDATION_ERROR', 'Validation failed', 400, details);
    }
    req[source] = value;
    next();
  };
};

export default validate;
