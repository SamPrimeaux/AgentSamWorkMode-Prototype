import { main } from './cli.mjs';

main(process.argv.slice(2)).catch((err) => {
  console.error(`agentsam-bridge: ${err.message || err}`);
  process.exit(1);
});
