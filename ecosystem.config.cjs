// ecosystem.config.cjs - Deterministic ExecOS Process Definition
// Sanitizes the PM2 process environment to prevent developer shell / IDE / Cursor variable bleed.
module.exports = {
  apps: [{
    name: 'execos',
    script: './server.js',
    cwd: process.env.EXECOS_DEFAULT_CWD || '/Users/samprimeaux/ExecOS',
    instances: 1,
    autorestart: true,
    max_memory_restart: '256M',
    env: {
      NODE_ENV: 'production',
      PORT: 3099,

      // Authentication & bridge secrets
      EXECOS_KEY: process.env.EXECOS_KEY || 'sk_execos_live_••••••••89f2',
      PTY_AUTH_TOKEN: process.env.PTY_AUTH_TOKEN || 'pty_tok_••••••••51ac',
      AGENTSAM_BRIDGE_KEY: process.env.AGENTSAM_BRIDGE_KEY || 'brg_••••••••74a9',

      // Narrowly scoped filesystem & repo paths
      EXECOS_DEFAULT_CWD: '/Users/samprimeaux/ExecOS',
      EXECOS_MCP_FS_ROOTS: '/Users/samprimeaux',
      SAM_OPERATOR_REPO_PATHS: '/Users/samprimeaux/Projects',

      // Edge worker & tunnel routing
      WORKER_URL: 'https://inneranimalmedia.com/api/agent',
      TUNNEL_URL: 'https://user-hosted-tunnel.inneranimalmedia.com',
      ALLOWED_TENANTS: 'inneranimals'

      // Note: SSH_AUTH_SOCK is omitted by default to maintain narrow privilege.
      // If SSH agent forwarding is required, declare it explicitly:
      // SSH_AUTH_SOCK: process.env.SSH_AUTH_SOCK
    }
  }]
};
