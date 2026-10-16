import { Request, Response, NextFunction } from 'express';
export declare class PaymentsController {
    private paymentsService;
    constructor();
    createPaymentIntent: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    payWithWallet: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    verifyPayment: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    handleWebhook: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    handleRazorpayWebhook: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    simulateWebhook: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    handleRedirect: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    renderCheckoutPage: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=payments.controller.d.ts.map