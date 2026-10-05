import { Request, Response, NextFunction } from 'express';
import { UsersService } from './users.service';
import { ApiResponse } from '../../shared/utils/response';

export class UsersController {
  private usersService: UsersService;

  constructor() {
    this.usersService = UsersService.getInstance();
  }

  public getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user.sub;
      const profile = await this.usersService.getProfile(userId);
      ApiResponse.success(res, profile, 'Profile retrieved');
    } catch (error) {
      next(error);
    }
  };

  public updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user.sub;
      const updated = await this.usersService.updateProfile(userId, req.body);
      ApiResponse.success(res, updated, 'Profile updated');
    } catch (error) {
      next(error);
    }
  };
}
