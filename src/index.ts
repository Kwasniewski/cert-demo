#!/usr/bin/env node

/**
 * Azure Certificate Chain Tool
 * 
 * This tool provides functionality to:
 * - Download certificates from Azure Key Vault
 * - Create chained certificates with intermediate and root certificates
 * - Upload the chained certificates back to Azure Key Vault
 * 
 * Usage:
 *   npm run dev -- chain --source my-cert --target my-chained-cert
 *   npm run dev -- list
 *   npm run dev -- info --name my-cert
 *   npm run dev -- test
 */

import './cli';

// Export main classes for programmatic use
export { CertificateTool } from './certificate-tool';
export { KeyVaultClient } from './keyvault-client';
export * from './types';
