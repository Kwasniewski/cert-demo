#!/usr/bin/env node

import { Command } from 'commander';
import { CertificateTool } from './certificate-tool';
import { KeyVaultConfig, ChainConfig, AuthOptions } from './types';

const program = new Command();

program
  .name('azure-cert-chain-tool')
  .description('Tool to download certificates from Azure Key Vault, create chained certificates, and upload them back')
  .version('1.0.0');

// Global options
program
  .option('-v, --vault-url <url>', 'Azure Key Vault URL')
  .option('-t, --tenant-id <id>', 'Azure Tenant ID')
  .option('-c, --client-id <id>', 'Azure Client ID')
  .option('-s, --client-secret <secret>', 'Azure Client Secret')
  .option('--use-managed-identity', 'Use managed identity for authentication')
  .option('--use-client-secret', 'Use client secret for authentication')
  .option('--verbose', 'Enable verbose logging');

// List command
program
  .command('list')
  .description('List all certificates in the Key Vault')
  .action(async () => {
    try {
      const config = getKeyVaultConfig(program.opts());
      const authOptions = getAuthOptions(program.opts());
      
      const tool = new CertificateTool(config, authOptions);
      
      console.log('📋 Listing certificates...');
      const certificates = await tool.listCertificates();
      
      if (certificates.length === 0) {
        console.log('No certificates found in the Key Vault.');
      } else {
        console.log(`Found ${certificates.length} certificates:`);
        certificates.forEach((cert, index) => {
          console.log(`  ${index + 1}. ${cert}`);
        });
      }
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

// Info command
program
  .command('info')
  .description('Get detailed information about a certificate')
  .requiredOption('-n, --name <name>', 'Certificate name')
  .option('-v, --version <version>', 'Certificate version (optional)')
  .action(async (options) => {
    try {
      const config = getKeyVaultConfig(program.opts());
      const authOptions = getAuthOptions(program.opts());
      
      const tool = new CertificateTool(config, authOptions);
      
      console.log(`📄 Getting certificate information for: ${options.name}`);
      const certInfo = await tool.getCertificateDetails(options.name, options.version);
      
      console.log('\n📋 Certificate Information:');
      console.log(`  Name: ${certInfo.name}`);
      console.log(`  Version: ${certInfo.version}`);
      console.log(`  Thumbprint: ${certInfo.thumbprint}`);
      console.log(`  Subject: ${certInfo.subject}`);
      console.log(`  Issuer: ${certInfo.issuer}`);
      console.log(`  Valid From: ${certInfo.notBefore.toISOString()}`);
      console.log(`  Valid To: ${certInfo.notAfter.toISOString()}`);
      console.log(`  Key Usage: ${certInfo.keyUsage.join(', ')}`);
      console.log(`  Extended Key Usage: ${certInfo.extendedKeyUsage.join(', ')}`);
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

// Test command
program
  .command('test')
  .description('Test connection to Azure Key Vault')
  .action(async () => {
    try {
      const config = getKeyVaultConfig(program.opts());
      const authOptions = getAuthOptions(program.opts());
      
      const tool = new CertificateTool(config, authOptions);
      
      console.log('🔍 Testing Key Vault connection...');
      const result = await tool.testConnection();
      
      if (result.success) {
        console.log('✅', result.message);
        process.exit(0);
      } else {
        console.error('❌', result.message);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

// Delete command
program
  .command('delete')
  .description('Delete a certificate from Key Vault')
  .requiredOption('-n, --name <name>', 'Certificate name to delete')
  .option('--confirm', 'Skip confirmation prompt')
  .action(async (options) => {
    try {
      const config = getKeyVaultConfig(program.opts());
      const authOptions = getAuthOptions(program.opts());
      
      const tool = new CertificateTool(config, authOptions);
      
      if (!options.confirm) {
        console.log(`⚠️  Are you sure you want to delete certificate '${options.name}'?`);
        console.log('   This action cannot be undone.');
        console.log('   Use --confirm flag to skip this prompt.');
        process.exit(0);
      }
      
      console.log(`🗑️  Deleting certificate: ${options.name}`);
      const result = await tool.deleteCertificate(options.name);
      
      if (result.success) {
        console.log('✅', result.message);
        process.exit(0);
      } else {
        console.error('❌', result.message);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

// Helper functions
function getKeyVaultConfig(options: any): KeyVaultConfig {
  const config: KeyVaultConfig = {
    vaultUrl: options.vaultUrl || process.env.AZURE_KEY_VAULT_URL || '',
    tenantId: options.tenantId || process.env.AZURE_TENANT_ID || '',
    clientId: options.clientId || process.env.AZURE_CLIENT_ID || '',
    clientSecret: options.clientSecret || process.env.AZURE_CLIENT_SECRET
  };

  // Validate required fields
  if (!config.vaultUrl) {
    throw new Error('Key Vault URL is required. Use --vault-url or set AZURE_KEY_VAULT_URL environment variable.');
  }
  if (!config.tenantId) {
    throw new Error('Tenant ID is required. Use --tenant-id or set AZURE_TENANT_ID environment variable.');
  }
  if (!config.clientId) {
    throw new Error('Client ID is required. Use --client-id or set AZURE_CLIENT_ID environment variable.');
  }

  return config;
}

function getAuthOptions(options: any): AuthOptions {
  return {
    useManagedIdentity: options.useManagedIdentity || process.env.AZURE_USE_MANAGED_IDENTITY === 'true',
    useClientSecret: options.useClientSecret || process.env.AZURE_USE_CLIENT_SECRET === 'true'
  };
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Parse command line arguments
program.parse();
