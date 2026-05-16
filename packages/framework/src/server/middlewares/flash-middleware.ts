import type { Middleware } from '@server/types';

/**
 * Flash Middleware
 * 
 * Handles flash data (validation errors, old input, success/error messages)
 * for Inertia requests.
 * 
 * Features:
 * - Extracts validation errors from session and makes them available as shared data
 * - Extracts old input values for form repopulation
 * - Provides success/message flash data
 */
export default (({ req, res, next }) => {
    // Initialize flash object on response
    res.flash = {
        errors: req.session.errors || {},
        old: req.session.old || {},
        success: undefined,
        message: undefined,
    };

    // Get flash messages from session
    if (req.session.success) {
        res.flash.success = req.session.success;
    }
    if (req.session.message) {
        res.flash.message = req.session.message;
    }

    // Clear session flash data after reading (but keep errors for later)
    if (req.session.success) {
        delete req.session.success;
    }
    if (req.session.message) {
        delete req.session.message;
    }
    if (req.session.old) {
        delete req.session.old;
    }

    // Note: Errors are cleared in the controller after being used
    // This middleware just makes them available to the response

    next();
}) as Middleware;
