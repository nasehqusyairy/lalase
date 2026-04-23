import type { Request, Response, NextFunction } from 'express';
import { ControllerAction } from '../types';

export function handler(action: ControllerAction) {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            return action({ req, res });
        } catch (err) {
            next(err);
        }
    };
}
