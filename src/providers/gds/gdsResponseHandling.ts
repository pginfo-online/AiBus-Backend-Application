import axios, { AxiosInstance } from 'axios';
import { ProviderError } from '../../shared/errors';

export function installGdsResponseHandling(client: AxiosInstance): void {
  client.interceptors.response.use((response) => {
    if (response.data?.success === false || response.data?.Error) {
      throw new ProviderError('GDS', 'Partner rejected the request');
    }
    return response;
  }, async (error: unknown) => {
    if (!axios.isAxiosError(error) || !error.config) throw error;
    const config = error.config as typeof error.config & { gdsRetry?: boolean };
    const status = error.response?.status;
    const transient = status === 502 || status === 503 || status === 504
      || error.code === 'ECONNRESET' || error.code === 'EAI_AGAIN';
    if (config.method !== 'get' || !transient || config.gdsRetry) throw error;
    await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 150));
    return client.request({ ...config, gdsRetry: true } as typeof config);
  });
}
