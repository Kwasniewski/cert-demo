#!/usr/bin/env node

import { Command } from 'commander';
import { CertificateTool } from './certificate-tool';
import { KeyVaultConfig, ChainConfig, AuthOptions, RootCAConfig, IntermediateCAConfig, EndEntityCertConfig } from './types';

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

// Create Root CA command
program
  .command('create-root-ca')
  .description('Create a new root CA certificate')
  .requiredOption('-n, --name <name>', 'Certificate name')
  .requiredOption('-s, --subject <subject>', 'Certificate subject (e.g., "CN=My Root CA,O=My Company,C=US")')
  .option('--key-size <size>', 'Key size in bits', '4096')
  .option('--validity-days <days>', 'Validity period in days', '3650')
  .option('--path-length <length>', 'Maximum path length for intermediate CAs', '0')
  .action(async (options) => {
    try {
      const config = getKeyVaultConfig(program.opts());
      const authOptions = getAuthOptions(program.opts());
      
      const tool = new CertificateTool(config, authOptions);
      
      console.log(`🔐 Creating root CA: ${options.name}`);
      const result = await tool.createRootCA({
        name: options.name,
        subject: options.subject,
        keySize: parseInt(options.keySize),
        validityDays: parseInt(options.validityDays),
        pathLength: parseInt(options.pathLength)
      });
      
      if (result.success) {
        console.log('✅', result.message);
        console.log(`   Thumbprint: ${result.thumbprint}`);
        console.log(`   Certificate name: ${result.certificateName}`);
      } else {
        console.error('❌', result.message);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

// Create Intermediate CA command
program
  .command('create-intermediate-ca')
  .description('Create a new intermediate CA certificate')
  .requiredOption('-n, --name <name>', 'Certificate name')
  .requiredOption('-s, --subject <subject>', 'Certificate subject (e.g., "CN=My Intermediate CA,O=My Company,C=US")')
  .requiredOption('-i, --issuer <issuer>', 'Name of the root CA in Key Vault')
  .option('--key-size <size>', 'Key size in bits', '4096')
  .option('--validity-days <days>', 'Validity period in days', '1825')
  .option('--path-length <length>', 'Maximum path length for end-entity certificates', '0')
  .action(async (options) => {
    try {
      const config = getKeyVaultConfig(program.opts());
      const authOptions = getAuthOptions(program.opts());
      
      const tool = new CertificateTool(config, authOptions);
      
      console.log(`🔗 Creating intermediate CA: ${options.name}`);
      console.log(`   Issued by: ${options.issuer}`);
      const result = await tool.createIntermediateCA({
        name: options.name,
        subject: options.subject,
        issuerCA: options.issuer,
        keySize: parseInt(options.keySize),
        validityDays: parseInt(options.validityDays),
        pathLength: parseInt(options.pathLength)
      });
      
      if (result.success) {
        console.log('✅', result.message);
        console.log(`   Thumbprint: ${result.thumbprint}`);
        console.log(`   Certificate name: ${result.certificateName}`);
      } else {
        console.error('❌', result.message);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

// Create End-Entity Certificate command
program
  .command('create-cert')
  .description('Create a new end-entity certificate')
  .requiredOption('-n, --name <name>', 'Certificate name')
  .requiredOption('-s, --subject <subject>', 'Certificate subject (e.g., "CN=example.com,O=My Company,C=US")')
  .requiredOption('-i, --issuer <issuer>', 'Name of the intermediate CA in Key Vault')
  .option('--key-size <size>', 'Key size in bits', '2048')
  .option('--validity-days <days>', 'Validity period in days', '365')
  .option('--san <sans>', 'Subject Alternative Names (comma-separated)', '')
  .option('--extended-key-usage <usage>', 'Extended key usage (comma-separated: serverAuth,clientAuth,codeSigning)', 'serverAuth,clientAuth')
  .action(async (options) => {
    try {
      const config = getKeyVaultConfig(program.opts());
      const authOptions = getAuthOptions(program.opts());
      
      const tool = new CertificateTool(config, authOptions);
      
      console.log(`📜 Creating end-entity certificate: ${options.name}`);
      console.log(`   Issued by: ${options.issuer}`);
      
      const sanList = options.san ? options.san.split(',').map((s: string) => s.trim()) : undefined;
      const extendedKeyUsage = options.extendedKeyUsage ? options.extendedKeyUsage.split(',').map((s: string) => s.trim()) : ['serverAuth', 'clientAuth'];
      
      const result = await tool.createEndEntityCertificate({
        name: options.name,
        subject: options.subject,
        issuerCA: options.issuer,
        keySize: parseInt(options.keySize),
        validityDays: parseInt(options.validityDays),
        san: sanList,
        extendedKeyUsage: extendedKeyUsage
      });
      
      if (result.success) {
        console.log('✅', result.message);
        console.log(`   Thumbprint: ${result.thumbprint}`);
        console.log(`   Certificate name: ${result.certificateName}`);
        if (sanList && sanList.length > 0) {
          console.log(`   SAN: ${sanList.join(', ')}`);
        }
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
