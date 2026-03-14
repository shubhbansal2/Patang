import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { getUserPenaltySummary } from '../services/penaltyService.js';

/**
 * GET /api/penalties/my
 * View current user's penalty history.
 */
export const getMyPenalties = async (req, res) => {
  try {
    const userId = req.user._id;
    const summary = await getUserPenaltySummary(userId);
    return successResponse(res, summary);
  } catch (error) {
    return errorResponse(res, 'SERVER_ERROR', error.message, 500);
  }
};
