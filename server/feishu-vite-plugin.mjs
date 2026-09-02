import { fileURLToPath } from 'node:url';
import { loadFeishuIdentifierContract } from './feishu-identifier-contract.mjs';
import { createFeishuOpenApiClient } from './feishu-open-api-client.mjs';
import { createFeishuReadOnlyService } from './feishu-read-only-service.mjs';
import { createFeishuNodeMiddleware } from './feishu-proxy-handler.mjs';

export function feishuReadOnlyProxy(options = {}) {
  const contractPath = fileURLToPath(new URL('./contracts/feishu-base-identifiers.json', import.meta.url));
  const identifierContract = loadFeishuIdentifierContract(contractPath);
  const client = createFeishuOpenApiClient(options);
  const service = createFeishuReadOnlyService({ client, identifierContract });
  const middleware = createFeishuNodeMiddleware({ service });
  const install = server => {
    server.middlewares.use(middleware);
  };
  return {
    name: 'feishu-read-only-proxy',
    configureServer: install,
    configurePreviewServer: install
  };
}
