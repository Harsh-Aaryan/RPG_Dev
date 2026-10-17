import { getDb } from '../../shared/server/db';
import { gemmaAvailable } from '../../shared/server/gemma';
import { json } from '../../shared/server/http';
import type { ServerConfig } from '../../shared/types';

/** Public capability flags. Never returns secrets, only whether features are switched on. */
export default async () => {
  const config: ServerConfig = {
    shared: Boolean(getDb()),
    gemma: gemmaAvailable(),
    github: Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_REPO),
    hostTokenRequired: Boolean(process.env.HOST_TOKEN),
  };
  return json(config);
};
