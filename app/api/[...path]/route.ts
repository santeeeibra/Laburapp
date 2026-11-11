import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
import { handleApi } from '../../../lib/api.mjs';
export const dynamic = 'force-dynamic';
async function handle(request: Request) {
  const identity = await getChatGPTUser();
  return handleApi(request, env, identity);
}
export const GET=handle;
export const POST=handle;
